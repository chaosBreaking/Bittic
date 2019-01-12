'use strict'
const event = require('events')
const Peer = require('./Peer.js')
const Proxy = require('./Proxy.js')
const Socketio = require('socket.io')
const io = require('socket.io-client')
const Schedule = require('node-schedule')
const store = require('../util/StoreApi.js')('redis', { db: wo.Config.redisIndex || 1 })
const p2pServer = require('http').Server()
const myself = new Peer({
  ownerAddress: wo.Crypto.secword2address(wo.Config.ownerSecword),
  accessPoint: wo.Config.protocol + '://' + wo.Config.host + 60842,
  host: wo.Config.host,
  port: 60842
})
const MAX_CALL_TIMEOUT = 200
const MAX_RECALL_TIME = 2
const MSG_TTL = 3
class SocCluster extends event {
  constructor (prop) {
    super(prop)
    this.peerBook = new Map()
    this.ids2address = {}
    this.scheduleJob = []
    this.socServer = Socketio(p2pServer)
    this.socServer.on('open', () => {
      mylog.info('<====== Socket Started ======>')
    })
    this.socServer.on('connection', (socket) => {
      mylog.info('New Client Connected')
      this.addEventHandler(socket)
    })
    this.socServer.on('disconnect', () => {
      mylog.info('user disconnected')
    })
    p2pServer.listen(60842, () => {
      mylog.info('<====== P2P Swarm Listing on *:60606 ======>')
    })
  }
  static getInstance (option) {
    if (!SocCluster.instance) {
      SocCluster.instance = new SocCluster(option)
    }
    return SocCluster.instance
  }
}

function getUrl (peer) {
  if (peer && peer.accessPoint) { return peer.accessPoint }
  if (typeof peer === 'string') {
    if (peer.includes('http://') || peer.includes('ws://')) {
      // 'http://host:port' or 'http://host'
      if (peer.split(':')[2]) { return peer } else { return peer + wo.Config.port }
    } else {
      if (peer.split(':')[1]) { return 'http://' + peer } else { return 'http://' + peer + wo.Config.port }
    }
  }
}
/**
 * 发送消息、广播、调用都必须要用身份认证，而且要防止垃圾信息和大量的转发
 */
function checkMAC (message) {
  // try {
  //   let { data, signature, pubkey } = message
  //   return data && signature && pubkey
  //   // return wo.Crypto.verifySig(data, signature, pubkey)
  // } catch (error) {
  //   return false
  // }
  return true
}

SocCluster.prototype._init = async function () {
  // 建立种子节点库
  if (wo.Config.seedSet && Array.isArray(wo.Config.seedSet) && wo.Config.seedSet.length > 0) {
    mylog.info('初始化种子节点')
    await Promise.all(wo.Config.seedSet.map(async (peer) => {
      if (this.peerBook.size >= wo.Config.PEER_POOL_CAPACITY) { return 0 }
      let connect = io(getUrl(peer))
      if (connect) {
        await new Promise((resolve, reject) => {
          connect.emit('Ping', myself, async (peerInfo) => {
            this.addNewPeer(peerInfo, connect)
            resolve('ok')
          })
        })
        connect.emit('sharePeers', (peers = []) => {
          this.sharePeersHandler(peers)
        })
      }
    }))
  }
  // 1 * * * * * 表示每分钟的第1秒执行
  // */10 * * * * * 表示每10秒执行一次
  this.scheduleJob[0] = Schedule.scheduleJob(`*/30 * * * * *`, () => {
    mylog.info(`当前拥有${this.peerBook.size}个节点`)
  })
  return this
}
SocCluster.prototype.mountSocket = function (webServer) {
  this.socServer = Socketio(webServer).on('open', () => {
    mylog.info('<====== Socket Started ======>')
  })
  this.socServer.on('connection', (socket) => {
    mylog.info('New Client Connected')
    this.addEventHandler(socket)
  })
}

SocCluster.prototype.checkValid = function (peer) {
  return Peer.checkValid(peer) && peer.ownerAddress !== myself.ownerAddress
}
SocCluster.prototype.addNewPeer = function (peerInfo, connect) {
  if (!this.checkValid(peerInfo) || !connect) return 0
  mylog.info('收到节点echo：', peerInfo.ownerAddress)
  if (connect.ids) this.ids2address[connect.ids] = peerInfo.ownerAddress
  connect.id = peerInfo.ownerAddress
  this.peerBook.set(peerInfo.ownerAddress, connect)
  this.addEventHandler(connect)
  this.storePeer(peerInfo)
}
SocCluster.prototype.storePeer = async function (peer) {
  if (this.checkValid(peer)) {
    peer = Object.getPrototypeOf(peer) === 'Peer' ? peer : new Peer(peer)
    await store.hset('peers', peer.ownerAddress, JSON.stringify(peer))
    return peer
  }
  return null
}
SocCluster.prototype.storePeerList = async function (peerData) {
  if (!Array.isArray(peerData)) {
    var peer = new Peer(peerData)
    await this.storePeer(peer)
    return peer
  } else {
    for (let peer of peerData) {
      try {
        await this.storePeer(typeof peer === 'string' ? JSON.parse(peer) : peer)
      } catch (error) {
        return error
      }
      return peerData
    }
  }
}

/**
 *
 * @desc 获取所有节点或给定地址的某个节点
 * @param {string} ownerAddress
 * @returns
 */
SocCluster.prototype.getPeersFromDB = async function (ownerAddress) {
  if (ownerAddress) { return JSON.parse((await store.hget('peers', ownerAddress))) }
  let peers = await store.hgetall('peers')
  let keys = Object.keys(peers)
  for (let peer of keys) {
    peers[peer] = JSON.parse(peers[peer])
  }
  return peers
}
SocCluster.prototype.delPeer = async function (ownerAddress) {
  if (ownerAddress) {
    await store.hdel('peers', ownerAddress)
    return true
  }
  return null
}
/**
 *
 * @desc 响应邻居节点发来的ping请求,如果是新节点则加入自身节点池
 * @param {*} option
 * @returns {Peer} myself
 */
SocCluster.prototype.pingHandler = async function (peerInfo, connect) {
  if (peerInfo && this.checkValid(peerInfo)) {
    let isNewPeer = !(await this.getPeersFromDB())[peerInfo.ownerAddress]
    if (isNewPeer) { // 是新邻居发来的ping？把新邻居加入节点池
      await this.addNewPeer(peerInfo, connect)
      mylog.info(`加入新节点 -- ${peerInfo.ownerAddress}-${peerInfo.accessPoint}:${peerInfo.port}`)
    }
    return myself // 把远方节点的信息添加一些资料后，返回给远方节点
  }
  mylog.warn('节点记录失败：错误的节点信息')
  return null
}
SocCluster.prototype.sharePeersHandler = async function (peers = []) {
  if (!Array.isArray(peers) || peers.length === 0) return 0
  mylog.info('收到共享节点')
  peers = [...peers]
  for (let peer of peers) {
    if (this.peerBook.size >= wo.Config.PEER_POOL_CAPACITY) { break }
    if (!this.checkValid(peer)) { continue }
    let connect = io(getUrl(peer))
    if (connect) {
      connect.emit('Ping', myself, async (peerInfo) => {
        this.addNewPeer(peerInfo, connect)
      })
    }
  }
}
SocCluster.prototype.sharePeer = async function () { // 响应邻居请求，返回更多节点。option.Peer是邻居节点。
  let res = Object.values(await this.getPeersFromDB() || {}) // todo: 检查 option.Peer.ownerAddress 不要把邻居节点返回给这个邻居自己。
  return res
}
SocCluster.prototype.getPeer = function (ownerAddress) {
  if (this.peerBook.size === 0) return { ownerAddress: null, socket: null }
  if (!ownerAddress) {
    let [ownerAddress, socket] = Array.from(this.peerBook)[Math.floor(Math.random(this.peerBook.size - 1))]
    return {
      ownerAddress,
      socket
    }
  } else {
    let socket = this.peerBook.get(ownerAddress)
    if (socket) {
      return {
        ownerAddress,
        socket
      }
    }
  }
}
SocCluster.prototype.pushPeerBack = function (ownerAddress, socket) {
  this.peerBook.set(ownerAddress, socket)
  return ownerAddress
}
/**
 * emitPeer和call的标准消息格式
 * message =>
 * {
 *    header:{},
 *    body:{
 *      data, param
 *    }
 * }
 */
SocCluster.prototype.emitPeers = function (event, data, socket = '') {
  // 如果用句柄传入的socket.broadcast.emit('xxx',data) 则会过滤掉发信人进行广播
  // 如果直接用this.socket.emit('xxx',data)则会对包含发信人的所有人进行广播
  try {
    data = JSON.stringify(data)
  } catch (error) {}
  if (this.socServer && this.socServer.emit) {
    this.socServer.emit('emit', {
      header: {},
      body: {
        event, data
      }
    })
  }
  if (this.peerBook.size === 0) return 0
  this.peerBook.forEach((socket, address) => {
    socket.emit('emit', {
      header: {},
      body: {
        event, data
      }
    })
  })
}
SocCluster.prototype.call = async function (route, param, rec = MAX_RECALL_TIME) {
  let { ownerAddress, socket } = this.getPeer()
  if (!ownerAddress || !socket) return 0
  if (!socket || !socket.emit || !rec) {
    if (!rec) { this.delPeer(ownerAddress) }
    return 0
  }
  let header = {}
  try {
    param = JSON.stringify(param)
  } catch (error) {}
  let callMission = new Promise((resolve, reject) => {
    socket.emit('call', { header, body: { route, param } }, (res) => {
      resolve(res)
    })
  })
  let timeoutMission = new Promise((resolve, reject) => {
    setTimeout(() => { resolve(null) }, MAX_CALL_TIMEOUT)
  })
  let data = await Promise.race([callMission, timeoutMission])
  if (data) {
    return data
  }
  return this.call(route, param, rec - 1)
}
/**
 * 广播消息的格式
 * message =>
 * {
 *    header: {
 *      ttl: MSG_TTL
 *    },
 *    data: {}
 * }
 */
SocCluster.prototype.broadcast = function (data, socket) {
  // 如果用句柄传入的socket.broadcast.emit('xxx',data) 则会过滤掉发信人进行广播
  // 如果直接用this.socket.emit('xxx',data)则会对包含发信人的所有人进行广播
  try {
    data = JSON.stringify(data)
  } catch (error) {}
  if (this.socServer && this.socServer.emit) {
    this.socServer.emit('broadcast', {
      header: {
        ttl: MSG_TTL
      },
      data
    })
  } // 广播给连接到我的
  if (this.peerBook.size === 0) return 0
  this.peerBook.forEach((socket, address) => { // 广播给连接到我的
    socket.emit('broadcast', {
      header: {
        ttl: MSG_TTL
      },
      data
    })
  })
}
SocCluster.prototype.addEventHandler = function (socket) {
  // 给新的节点挂载事件监听器
  socket.on('Ping', (nodeInfo, echo) => {
    if (nodeInfo && echo && typeof echo === 'function') {
      this.pingHandler(nodeInfo, socket)
      return echo(myself)
    }
  })
  socket.on('sharePeers', async (echo) => {
    if (echo && typeof echo === 'function') {
      return echo(await this.getPeersFromDB())
    }
  })
  socket.on('call', async (message = {}, echo) => {
    // RPC 只允许被调用类的api内定义的函数
    if (!checkMAC(message.header)) { return 0 }
    let { route, param } = message.body
    if (route && typeof route === 'string' && echo && typeof echo === 'function') {
      try {
        let [obj, fn] = route.startsWith('/') ? route.slice(1).split('/') : route.split('/')
        if (wo[obj] && wo[obj]['api'] && wo[obj]['api'][fn] && typeof wo[obj]['api'][fn] === 'function') {
          mylog.info('触发调用', route)
          return echo(await wo[obj]['api'][fn](JSON.parse(param)))
        }
      } catch (error) {
        return echo(null)
      }
    }
  })
  socket.on('emit', (message) => {
    // 其他节点通过触发Peer的emit事件,来节点触发的事件需要wo.Peer的监听器
    // 我连接到的节点，无法调用socket.broadcast.emit()
    if (!message || !checkMAC(message.header) || !message.body) { return 0 }
    let { event, data } = message.body
    if (event && typeof event === 'string') {
      try {
        data = JSON.parse(data)
      } finally {
        this.emit(event, data)
        if (wo.EventBus) wo.EventBus.crosEmit('Peer', event, data)
        mylog.info('触发事件', event)
        this.socServer.emit(event, data) // 继续向发信人以外广播,前面已经反序列化了数据，此处要再次序列化。。。有没有更好的办法？
      }
    }
  })
  socket.on('broadcast', (message) => {
    // 广播消息(签名或交易等事务)
    if (!message || message.ttl <= 0 || message.ttl > MSG_TTL || !message.data) { return 0 }
    try {
      message.data = JSON.parse(message.data)
    } finally {
      this.emit('broadcast', message.data)
      if (wo.EventBus) wo.EventBus.crosEmit('Peer', 'broadcast', message.data)
      socket.broadcast.emit('broadcast', message) // 继续向发信人以外广播
    }
  })
  socket.on('disconnect', () => {
    if (socket.id) {
      this.peerBook.delete(socket.id)
      this.delPeer(socket.id)
    }
  })
}

module.exports = function (type = '') {
  if (type === 'proxy') {
    return new Proxy()
  } else return SocCluster.getInstance()
}
