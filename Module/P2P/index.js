const Ling = wo.Ling
const url = require('url')
const Peers = require('./Peers.js');
const RequestPromise = require('request-promise-native'); // request-promise/-native。https://www.npmjs.com/package/request-promise. 还看到一个方法：Bluebird.promisifyAll(require("request"));

const DAD = module.exports = function Peer(prop) {
  this._class = this.constructor.name
  this.setProp(prop)
}

DAD.__proto__ = Ling
const MOM = DAD.prototype
MOM.__proto__ = Ling.prototype

DAD.broadcast = async function (api, message, peers) { // api='/类名/方法名'  向所有邻居发出广播，返回所有结果的数组。可通过 peerSet 参数指定广播对象。
  let peerSet = peers || Object.values(await Peers.getPeers());
  if(peerSet && peerSet.length > 0){
    mylog.info('调用RPC广播到端口', wo.Config.port, api)
    let result = await Promise.all(peerSet.map((peer, index) => RequestPromise({
      method: 'post',
      uri: url.resolve(peer.accessPoint + ':' + wo.Config.port, '/api' + api),
      body: message,
      json: true
    }).catch(function (err) {
      mylog.warn('广播 ' + api + ' 到,',peer.accessPoint,'节点出错: ' + err.message)
      return null  // 其中一个节点出错，必须要在其catch里返回null，否则造成整个Promise.all出错进入catch了。
    }))).catch(console.log)
    return result
  }
}

DAD.randomcast = async function (api, message, peers) { // 随机挑选一个节点发出请求，返回结果。可通过 peerSet 参数指定广播对象。
  let peerSet = peers || Object.values(await Peers.getPeers());
  if(peerSet && peerSet.length > 0) {
    var peer = peerSet[wo.Crypto.randomNumber({ max: peerSet.length })];
    if (peer && peer.accessPoint) {
      mylog.info(`调用RPC发送`,message,`到${peer.accessPoint}:${wo.Config.port}`)
      let result = await RequestPromise({
        method: 'post',
        uri: url.resolve(peer.accessPoint + ':' + wo.Config.port, '/api' + api),
        body: message,
        json: true
      }).catch(function (err) { mylog.warn('点播 ' + api + ' 到随机节点出错: ' + err.message); return null })
      return result
    }
  }
  return null
}