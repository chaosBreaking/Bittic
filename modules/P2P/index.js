const Peers = require('./P2P.js')
module.exports = {
  broadcast: Peers.broadcast,
  randomcast: Peers.randomcast,
  getPeers: Peers.getPeers
}