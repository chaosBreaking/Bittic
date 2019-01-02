module.exports = function(p2p) {
  return require('./Peer'+p2p) // 根据算法，返回不同的对等网络。
}