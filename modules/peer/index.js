const peerSimple = require('./PeerSimple.js')
const peerSocket = require('./SocCluster.js')()
const proxy = require('./Proxy.js')
module.exports = function (type) {
  switch (type) {
    case 'simple':
      return peerSimple
    case 'socket':
      return peerSocket
    case 'proxy':
      return proxy
    default:
      return peerSimple
  }
}
