'use strict'
const event = require('events')
const Peer = require('./peer.js')
const Proxy = require('./proxy.js')
const socket = require('socket.io')
const io = require('socket.io-client')
const Schedule = require('node-schedule')
const store = require('../util/StoreApi.js')('redis')
const myself = new Peer({
  ownerAddress: wo.Crypto.secword2address(wo.Config.ownerSecword),
  accessPoint: wo.Config.protocol + '://' + wo.Config.host + wo.Config.port,
  host: wo.Config.host,
  port: wo.Config.port,
})
const MAX_CALL_TIMEOUT = 200

class NetMonitor extends event {
  constructor(prop) {
    super(prop)
    this.peerBook = {}
    this.ids2address = {}
    this.scheduleJob = []
  }
  static getInstance(option) {
    if(!NetMonitor.instance) {
      NetMonitor.instance = new NetMonitor(option)
    }
    return NetMonitor.instance
  }
}

function getUrl(peer) {
  if(peer && peer.accessPoint)
    return peer.accessPoint
  if(typeof peer === 'string') {
    if(peer.includes('http://') || peer.includes('ws://')) {
      // 'http://host:port' or 'http://host'
      if(peer.split(":")[2])
        return peer
      else
        return peer + wo.Config.port
    }
    else {
      if(peer.split(":")[1])
        return 'http://' + peer
      else 
        return 'http://' + peer + wo.Config.port
    }
  }
}

NetMonitor.prototype._init = async function () {
  // 建立种子节点库
  if (wo.Config.seedSet && Array.isArray(wo.Config.seedSet) && wo.Config.seedSet.length > 0) {
    mylog.info('初始化种子节点')
    await Promise.all(wo.Config.seedSet.map((peer) => {
      if(Object.keys(this.peerBook).length >= wo.Config.PEER_POOL_CAPACITY)
        return 0
      let connect = io(getUrl(peer))
      if(connect) {
        connect.emit('Ping', myself, async (peerInfo) => {
          this.addNewPeer(peerInfo, connect)
        })
        connect.emit('sharePeers', (peers = []) => {
          this.sharePeersHandler(peers)
        })
      }
    }))
  }
  setInterval(async ()=>{
    mylog.info(`当前拥有${Object.keys(this.peerBook).length}个节点`)
    if(this.socket) {
      // this.emitPeers('Peer', 'Ping', '?')
      let data = await this.call('Block/getBlock', {height: 1})
      if(data)
        mylog.info('成功取得数据', data)
      else 
        mylog.info('断开......')
      
      // .then((data) => {
      // })
    }
  }, 5000)
  // this.scheduleJob[0] = Schedule.scheduleJob(`*/59 * * * * *`, NetMonitor.updatePool)
  return this
}
NetMonitor.prototype.mountSocket = function (webServer) {
  this.socket = socket(webServer).on('open', () => {
    mylog.info('<====== Socket Started ======>')
  })
  this.socket.on('connection', (socket) => {
    mylog.info('New Client Connected')
    this.addEventHandler(socket)
  });
}
NetMonitor.prototype.checkValid = function(peer) {
  return Peer.checkValid(peer) && peer.ownerAddress !== myself.ownerAddress
}
NetMonitor.prototype.addNewPeer = function (peerInfo, connect) {
  if(!this.checkValid(peerInfo) || !connect) return 0
  mylog.info('收到节点echo：', peerInfo.ownerAddress)
  if(connect.ids) this.ids2address[connect.ids] = peerInfo.ownerAddress;
  connect.id = peerInfo.ownerAddress
  this.peerBook[peerInfo.ownerAddress] = connect
  this.addEventHandler(connect)
  this.storePeer(peerInfo)
}
NetMonitor.prototype.sharePeersHandler = async function(peers = []) {
  if(!Array.isArray(peers) || peers.length === 0) return 0
  mylog.info('收到共享节点')
  peers = [...peers]
  for(let peer of peers) {
    if(Object.keys(this.peerBook).length >= PEER_POOL_CAPACITY)
      break
    if(!this.checkValid(peer))
      continue
    let connect = io(getUrl(peer))
    if(connect) {
      connect.emit('Ping', myself, async (peerInfo) => {
        this.addNewPeer(peerInfo, connect)
      })
    }
  }
}

/**
 *
 * @desc 检查一个传入节点的合法性后加入节点池
 * @param {Peer} peer
 * @returns {Peer} peer
 */
NetMonitor.prototype.storePeer = async function (peer) {
  if (this.checkValid(peer)) {
    peer = Object.getPrototypeOf(peer) === 'Peer'? peer: new Peer(peer)
    await store.hset('peers', peer.ownerAddress, JSON.stringify(peer));
    return peer
  }
  return null
}
NetMonitor.prototype.storePeerList = async function (peerData) {
  if (!Array.isArray(peerData)) {
    var peer = new Peer(peerData);
    await this.storePeer(peer);
    return peer
  }
  else {
    for (let peer of peerData) {
      try {
        await this.storePeer(typeof peer === 'string' ? JSON.parse(peer) : peer);
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
NetMonitor.prototype.getPeers = async function (ownerAddress) {
  if (ownerAddress)
    return JSON.parse((await store.hget('peers', ownerAddress)));
  let peers = await store.hgetall('peers');
  let keys = Object.keys(peers);
  for (let peer of keys) {
    peers[peer] = JSON.parse(peers[peer]);
  }
  return peers
}
NetMonitor.prototype.delPeer = async function (ownerAddress) {
  if (ownerAddress) {
    return await store.hdel('peers', ownerAddress)
  }
  return null
}
/**
 *
 * @desc 响应邻居节点发来的ping请求,如果是新节点则加入自身节点池
 * @param {*} option
 * @returns {Peer} myself
 */
NetMonitor.prototype.pingHandler = async function (peerInfo, connect) {
  if (peerInfo && this.checkValid(peerInfo)) {
    let isNewPeer = !(await this.getPeers())[peerInfo.ownerAddress]
    if (isNewPeer) { // 是新邻居发来的ping？把新邻居加入节点池
      await this.addNewPeer(peerInfo, connect)
      mylog.info(`加入新节点 -- ${peerInfo.ownerAddress}-${peerInfo.accessPoint}:${peerInfo.port}`)
    }
    return myself // 把远方节点的信息添加一些资料后，返回给远方节点
  }
  mylog.warn('节点记录失败：错误的节点信息');
  return null
}

NetMonitor.prototype.sharePeer = async function () { // 响应邻居请求，返回更多节点。option.Peer是邻居节点。
  let res = Object.values(await this.getPeers() || {}) // todo: 检查 option.Peer.ownerAddress 不要把邻居节点返回给这个邻居自己。
  return res
}
NetMonitor.prototype.popOnePeer = function() {
  let ownerAddress = Object.keys(this.peerBook)[Math.floor(Math.random(Object.keys(this.peerBook).length - 1))]
  let socket = this.peerBook[ownerAddress]
  delete this.peerBook[ownerAddress]
  return {
    ownerAddress,
    socket
  }
}
NetMonitor.prototype.pushPeerBack = function(ownerAddress, socket) {
  return this.peerBook[ownerAddress] = socket
}

// wo.Peer.broadcast('/Consensus/electWatcher', {Consensus: { Block: JSON.stringify(option.Block) }}) // 就进行广播
NetMonitor.prototype.emitPeers = function(event, data, socket = '') {
  if(socket && socket.broadcast && socket.broadcast.emit) socket.broadcast.emit('emit', {event, data})
  this.socket.emit('emit', {event, data})
  for(let peerAddress in this.peerBook) {
    this.peerBook[peerAddress].emit('emit', {event, data})
  }
}
NetMonitor.prototype.broadcast = function(data, socket = '') {
  if(socket && socket.broadcast) socket.broadcast(data)         //再次转发收到的广播，过滤掉了发给我的节点
  this.socket.broadcast(data)               //广播给连接到我的
  for(let peerAddress in this.peerBook) {   //广播给我连接到的
    this.peerBook[peerAddress].emit('broadcast', data)
  }
}
NetMonitor.prototype.call = async function(route, param, rec = 2) {
  let {ownerAddress, socket} = this.popOnePeer()
  if(!socket || !socket.emit || !rec) {
    if(!rec)
      this.delPeer(ownerAddress) 
    return 0
  }
  mylog.info('called --', rec)
  let callMission = new Promise((resolve, reject) => {
    socket.emit('call', route, param, (res) => {
      resolve(res)
    })
  })
  let timeoutMission = new Promise((resolve, reject) => {
    setTimeout(() => { resolve(null) }, MAX_CALL_TIMEOUT)
  })
  let data = await Promise.race([callMission, timeoutMission])
  if(data) {
    this.pushPeerBack(ownerAddress, socket)
    return data
  }
  return this.call(route, param, rec - 1)
}

NetMonitor.prototype.addEventHandler = function(socket) {
  //给新的节点挂载事件监听器
  socket.on('Ping', (nodeInfo, echo) => {
    if(nodeInfo && echo && typeof echo === 'function') {
      this.pingHandler(nodeInfo, socket)
      return echo(myself)
    }
  })
  socket.on('sharePeers', async (echo) => {
    return echo(await this.getPeers())
  })
  socket.on('call', async (data, echo) => {
    //RPC 只允许被调用类的api内定义的函数
    if(data && data.route && typeof data.route === 'string' && echo && typeof echo === 'function') {
      let [obj, fn] = data.route.split('/')
      if(wo[obj] && wo[obj]['api'] && wo[obj]['api'][fn])
        return echo(await wo[obj]['api'][fn](data.param))
    }
  })
  socket.on('emit', (req) => {
    //其他节点通过触发Peer的emit事件,来节点触发的事件需要wo.Peer的监听器
    if(req && req.event) {
      this.emit(req.event, req.data)
      wo.EventBus.crosEmit('Peer', req.event, req.data)
      this.emitPeers(req.event, req.data, socket) //继续向外广播
    }
  })
  socket.on('broadcast', (data) => {
    //广播消息(签名或交易等事务)
    this.emit('broadcast', data)
    wo.EventBus.crosEmit('Peer', 'broadcast', data)
    this.broadcast(data, socket)  //继续向外广播
  })
  socket.on('disconnect', () => {
    if(socket.id) {
      delete this.peerBook[socket.id]
      this.delPeer(socket.id)
    }
  })
}
module.exports = function(type = '') {
  if(type === 'proxy') {
    return new Proxy()
  }
  else return NetMonitor.getInstance()
}