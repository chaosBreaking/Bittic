const peerSimple = require('./PeerSimple.js')
const peerSocket = require('./SocCluster.js')
module.exports = function (type) {
	switch (type) {
		case 'simple':
			return peerSimple
		case 'socket':
			return peerSocket
		default:
			return peerSimple
	}
}
