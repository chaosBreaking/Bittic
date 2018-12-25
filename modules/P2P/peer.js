'use strict'
const PeerModel = { // 数据模型，用来初始化每个对象的数据
  ownerAddress: '', // 应当记录属于哪个用户，作为全网每个节点的唯一标志符
  accessPoint: '', // 该节点的http连接地址。
  host: '', // IP or hostname like http://remoteaddress.com or http://101.222.121.111
  port: '', //共识协议交流端口
  status: 'unknown', // unknown是刚加入pool时未知状态。开始检查后，状态是 active, broken, dead
  checking: 'idle', // idle 或 pending
  brokenCount: 0,
  ttl: 60,
}
class Peer {
  constructor(peerData) {
    if(!peerData || !peerData.ownerAddress || !peerData.accessPoint)
      return null
    Object.assign(this, PeerModel, peerData)
    return this
  }
  
  /**
   *
   * @desc 检查传入节点的信息格式否合法
   * @param {Peer} peer
   * @returns {boolean}
   */
  static checkValid(peer) {
    if (
      !peer.port ||
      !peer.accessPoint || 
      !peer.ownerAddress ||
      // peer.accessPoint.includes('192.168') || 
      peer.accessPoint.includes('localhost') || 
      peer.accessPoint.includes('127.0')
    )
      return false
    return true
  }
}
module.exports = Peer