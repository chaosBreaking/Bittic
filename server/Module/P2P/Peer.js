const Ling = wo.Ling
const url = require('url')
const RequestPromise = require('request-promise-native'); // request-promise/-native。https://www.npmjs.com/package/request-promise. 还看到一个方法：Bluebird.promisifyAll(require("request"));
const store = require('../../util/StoreApi.js')('redis', {
  db: 0
})
const DAD = module.exports = function Peer(prop) {
  this._class = this.constructor.name
  this.setProp(prop)
}
DAD.__proto__ = Ling
const MOM = DAD.prototype
MOM.__proto__ = Ling.prototype

DAD.broadcast = async function (api, message, peerSet) { // api='/类名/方法名'  向所有邻居发出广播，返回所有结果的数组。可通过 peerSet 参数指定广播对象。
  peerSet = peerSet || await DAD.getPeers()
  var result = await Promise.all(peerSet.map((peer, index) => RequestPromise({
    method: 'post',
    uri: url.resolve(peer.accessPoint + wo.Config.port, '/api' + api),
    body: message,
    json: true
  }).catch(function (err) {
    mylog.info('广播 ' + api + ' 到某个节点出错: ' + err.message)
    return null  // 其中一个节点出错，必须要在其catch里返回null，否则造成整个Promise.all出错进入catch了。
  }))).catch(console.log)
  return result
}

DAD.randomcast = async function (api, message, peerSet) { // 随机挑选一个节点发出请求，返回结果。可通过 peerSet 参数指定广播对象。
  peerSet = peerSet || await DAD.getPeers()
  var peer = peerSet[wo.Crypto.randomNumber({ max: peerSet.length })]
  if (peer instanceof DAD) {
    var result = await RequestPromise({
      method: 'post',
      uri: url.resolve(peer.accessPoint + wo.Config.port, '/api' + api),
      body: message,
      json: true
    }).catch(function (err) { mylog.info('点播 ' + api + ' 到随机节点出错: ' + err.message); return null })
    return result
  }
  return null
}
DAD.getPeers = async function () {
  let res = JSON.parse(await store.getKey('peers'));
  if (!res)
    return []
  return JSON.parse(await store.getKey('peers'))
}