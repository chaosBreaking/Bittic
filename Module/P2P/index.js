const Peers = require('./Peers.js')
module.exports = {
  broadcast: Peers.broadcast,
  randomcast: Peers.randomcast,
  getPeers: Peers.getPeers
}