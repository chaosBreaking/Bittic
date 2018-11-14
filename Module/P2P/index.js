const Ling = wo.Ling
const Peers = require('./Peers.js')

const DAD = module.exports = function Peer(prop) {
  this._class = this.constructor.name
  this.setProp(prop)
}

DAD.__proto__ = Ling
const MOM = DAD.prototype
MOM.__proto__ = Ling.prototype

DAD.broadcast = Peers.broadcast

DAD.randomcast = Peers.randomcast