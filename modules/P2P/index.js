'use strict'

const url = require('url');
const event = require('events')
const Peer = require('./peer.js')
const io = require('socket.io-client')
const Schedule = require('node-schedule')
const store = require('../../util/StoreApi.js')('redis')
const myself = new Peer({
  ownerAddress: wo.Crypto.secword2address(wo.Config.ownerSecword),
  accessPoint: wo.Config.protocol + '://' + wo.Config.host + wo.Config.port,
  host: wo.Config.host,
  port: wo.Config.port,      //web服务端口
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
    return peer.accessPoint + ':' + (peer.port ? peer.port : wo.Config.port)
  if(peer.split(":")[1])
    return peer
  else
    return peer + ':' + (peer.port ? peer.port : wo.Config.port)
}

NetMonitor.prototype._init = async function () {
  // 建立种子节点库
  if (wo.Config.seedSet && Array.isArray(wo.Config.seedSet) && wo.Config.seedSet.length > 0) {
    mylog.info('初始化种子节点')
    await Promise.all(wo.Config.seedSet.map((peer, index) => {
      if(Object.keys(this.peerBook).length >= PEER_POOL_CAPACITY)
        return 0
      let connect = io(getUrl(peer))
      if(connect && connect.connected) {
        connect.once('echo',async (peerInfo) => {
          mylog.info('收到节点echo：', peerInfo.ownerAddress)
          this.peerBook[peerInfo.ownerAddress] = connect
          await this.storePeer(peerInfo)
        })
        connect.once('sharePeers',async (peers) => {
          mylog.info('收到共享节点')
          this.sharePeersHandler(peers)
          // await this.storePeer(peers);
        })
        connect.emit('peer',{
          type: 'ping',
          data: myself
        })
        connect.emit('peer',{
          type: 'sharePeers'
        })
      }
    }))
  }
  setInterval(()=>mylog.info(`当前拥有${Object.keys(this.peerBook).length}个节点`),5000)
  // this.scheduleJob[0] = Schedule.scheduleJob(`*/59 * * * * *`, NetMonitor.updatePool)
  return this
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
        connect.once('echo',async (peerInfo) => {
          mylog.info('收到节点echo：', peerInfo.ownerAddress)
          this.peerBook[peerInfo.ownerAddress] = connect
          await this.storePeer(peerInfo)
        })
        connect.emit('peer',{
          type: 'ping',
          data: myself
        })
      }
    }
  }
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
 * @desc 检查一个传入节点的合法性后加入节点池
 * @param {Peer} peer
 * @returns {Peer} peer
 */
NetMonitor.prototype.storePeer = async function (peer) {
  if (Peer.checkValid(peer)) {
    await store.hset('peers', peer.ownerAddress, JSON.stringify(peer));
    return peer
  }
  return null
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
NetMonitor.prototype.ping = async function (peerInfo) {
  if (peerInfo && Peer.checkValid(peerInfo)) {
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
NetMonitor.proxy = {
  broadcast: async (data) => await wo.EventBus.call('Peer', '', 'broadcast', data),
  randomcast: async (data) => await wo.EventBus.call('Peer', '', 'randomcast', data)
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
    return NetMonitor.proxy
  }
  else return NetMonitor.getInstance()
}