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

class NetMonitor extends event {
  constructor(prop) {
    super(prop)
    this.peerBook = {}
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
    await Promise.all(wo.Config.seedSet.map((peer, index) => {
      if(Object.keys(this.peerBook).length >= wo.Config.PEER_POOL_CAPACITY)
        return 0
      let connect = io(getUrl(peer))
      if(connect) {
        connect.emit('Ping', myself, async (peerInfo) => {
          mylog.info('收到节点echo：', peerInfo.ownerAddress)
          this.peerBook[peerInfo.ownerAddress] = connect
          await this.storePeer(peerInfo)
        })
        connect.emit('sharePeers', (peers = []) => {
          if(!Array.isArray(peers) || peers.length === 0) return 0
          mylog.info('收到共享节点')
          this.sharePeersHandler(peers)
        })
      }
    }))
  }
  setInterval(()=>{
    mylog.info(`当前拥有${Object.keys(this.peerBook).length}个节点`)
    if(this.socket)
      this.socket.emit('test','收到没')
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
    // 定义其他节点连接到自己的socket后的监听器和处理函数
    socket.on('Ping', (nodeInfo, echo) => {
      if(nodeInfo && echo && typeof echo === 'function') {
        this.pingHandler(nodeInfo)
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
      //触发节点事件，节点触发的事件需要wo.Peer的监听器
      if(req && req.event) {
        this.emit(req.event, req.data)
        wo.EventBus.crosEmit('Peer', req.event, req.data)
      }
    })
    socket.on('broadcast', (data) => {
      //广播消息(签名或交易等事务)
      this.emit('broadcast', data)
      wo.EventBus.crosEmit('Peer', 'broadcast', data)
    })
  });
}
NetMonitor.prototype.sharePeersHandler = async function(peers = []) {
  peers = [...peers]
  if(Array.isArray(peers) && peers.length > 0) {
    for(let peer of peers) {
      if(Object.keys(this.peerBook).length >= PEER_POOL_CAPACITY)
        break
      if(!this.checkValid(peers))
        continue
      let connect = io(getUrl(peers))
      if(connect.connected) {
        connect.once('echo', async (peerInfo) => {
          mylog.info('收到节点echo：', peerInfo.ownerAddress)
          this.peerBook[peerInfo.ownerAddress] = connect
          await this.storePeer(peerInfo)
        })
        connect.emit('peer', {
          type: 'ping',
          data: myself
        })
      }
    }
  }
}
NetMonitor.prototype.checkValid = function(peer) {
  return Peer.checkValid(peer) && peer.ownerAddress !== myself.ownerAddress
}
/**
 *
 * @desc 检查一个传入节点的合法性后加入节点池
 * @param {Peer} peer
 * @returns {Peer} peer
 */
NetMonitor.prototype.storePeer = async function (peer) {
  if (this.checkValid(peer)) {
    await store.hset('peers', peer.ownerAddress, JSON.stringify(peer));
    return peer
  }
  return null
}
NetMonitor.prototype.storePeerList = async function (peerList) {
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
NetMonitor.prototype.pingHandler = async function (peerInfo) {
  if (peerInfo && this.checkValid(peerInfo)) {
    let isNewPeer = !(await this.getPeers())[peerInfo.ownerAddress]
    if (isNewPeer) { // 是新邻居发来的ping？把新邻居加入节点池
      await this.addNewPeer(new Peer(peerInfo))
      mylog.info(`加入新节点 -- ${option.Peer.ownerAddress}-${option.Peer.accessPoint}:${option.Peer.port}`)
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

// wo.Peer.broadcast('/Consensus/electWatcher', {Consensus: { Block: JSON.stringify(option.Block) }}) // 就进行广播
NetMonitor.prototype.broadcast = async function(route, param) {
  this.socket.broadcast({
    route, param
  })
}
NetMonitor.prototype.randomcast = async function() {
  return true
}

/**
 * socket.emit('peer',{
 *  type:['ping', 'sharePeers', 'heartBeat'],
 *  data: myself
 * })
 */
NetMonitor.prototype.eventHandler = async function(data, socket) {
  if(data && data.type) {
    switch(data.type) {
      case 'ping':
        await this.ping(data)
        socket.emit('echo', myself)
        return 0
      case 'sharePeers':
        let res = await this.sharePeer()
        socket.emit('sharePeers', res)
        return 0
      case 'heartBeat':
        return socket.emit('heartBeat',{data: myself})
    }
  }
}
module.exports = function(type = '') {
  if(type === 'proxy') {
    return new Proxy()
  }
  else return NetMonitor.getInstance()
}