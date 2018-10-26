const Ling = wo.Ling
const url = require('url');
const Schedule=require('node-schedule');
const RequestPromise = require('request-promise-native'); // request-promise/-native。https://www.npmjs.com/package/request-promise. 还看到一个方法：Bluebird.promisifyAll(require("request"));
const store = require('../../util/StoreApi.js')('redis',{
  db : 0
})

class Peers extends Ling {
  constructor(prop){
    super(prop)
    this._class = this.constructor.name;
    this.setProp(prop);
  }
}

Peers.prototype._tablekey = 'ownerAddress'
Peers.prototype._model = { // 数据模型，用来初始化每个对象的数据
  ownerAddress: { default: '' }, // 应当记录属于哪个用户，作为全网每个节点的唯一标志符
  accessPoint: { default: '' }, // 该节点的http连接地址。
  host: { default: '' }, // IP or hostname // 该节点连接我时，使用的远程主机
  port: { default: '' }, // 该节点连接我时，使用的远程端口
  status: { default: 'unknown' }, // unknown是刚加入pool时未知状态。开始检查后，状态是 active, broken, dead
  checking: { default: 'idle' }, // idle 或 pending
  lastRequest: { default: '' }, // 上一次 ping 请求的时间
  lastResponse: { default: '' }, // 上一次 ping 回复的时间
  lastReception: { default: '' }, // 上一次 ping 收到回复的时间
  brokenCount: { default: 0 }
}

module.exports = Peers

Peers.updatePool = async function () { // 从节点池取出第一个节点，测试其连通性，把超时无响应的邻居从池中删除。
  mylog.info('updatePool....')
  let peer = null
  while (!peer) {
    peer = await my.shiftPeerPool() // 每次取出第一个节点进行检查
    if(peer && peer.checking === 'pending'){
      await my.pushPeerPool(peer);
      peer = null;
    }
  }
  if (peer && peer.link !== 'dead') { // 是当前还有效的peer。如果已经dead，就不再执行，即不放回 pool 了。
    await my.pushPeerPool(peer) // 先放到最后，以防错过检查期间的broadcast等。如果已经是link=dead，就不放回去了。
    peer.checking = 'pending' // 正在检查中，做个标记，以防又重复被检查
    peer.lastRequest = Date.now() // 发起ping的时刻 
    var result = await RequestPromise({
      method: 'post',
      uri: url.resolve(peer.accessPoint + ':' + wo.Config.port, '/api/Peers/ping'),
      body: { Peer: JSON.stringify(my.self.setProp({ lastRequest: peer.lastRequest })) }, // 告诉对方，我是谁，以及发出ping的时间
      json: true
    }).catch(function (err) {
      return null
    })
    if (result && result.lastRequest === peer.lastRequest) { // 对方peer还活着
      peer.link = 'active'
      peer.lastResponse = result.lastResponse // 对方响应ping的时刻
      peer.lastReception = Date.now() // 收到对方ping的时刻
      peer.brokenCount = 0
      // todo: 做一些统计工作，计算所有ping的平均值，等等
    } else { // 对方peer无响应
      if (['active', 'unknown'].indexOf(peer.link) >= 0) {
        peer.link = 'broken' // 第一次ping不通，设为断线状态
        mylog.info('节点无响应：' + JSON.stringify(peer))
      } else if (peer.link === 'broken') { // 持续 5分钟无法ping通
        peer.brokenCount++
        if (peer.brokenCount > wo.Config.PEER_CHECKING_TIMEOUT) {
          peer.link = 'dead' // 连续两次无法ping通，就不要了 
          mylog.info('节点已超时，即将删除：' + JSON.stringify(peer))
        }
      }
    }
    peer.checking = 'idle'
  }

  // 补充一个新邻居
  if (my.peerAddressArray.length < wo.Config.PEER_POOL_CAPACITY) {
    let peerSet = await Peers.randomcast('/Peers/sharePeer', { Peer: JSON.stringify(my.self) }) // 先向邻居池 peerPool 申请
    //      || await Peers.randomcast('/Peer/sharePeer',{Peer:my.self},my.seedSet) // 也许邻居池为空，那就向种子节点申请。
    if (peerSet && peerSet.length > 0) {
      await Peers.addPeer2Pool(peerSet[wo.Crypto.randomNumber({ max: peerSet.length })]) // 随机挑选一个节点加入邻居池
    }
  }
}

Peers.broadcast = async function (api, message, peerSet) { // api='/类名/方法名'  向所有邻居发出广播，返回所有结果的数组。可通过 peerSet 参数指定广播对象。
  peerSet = peerSet || Object.values(await my.getPeers());
  var result = await Promise.all(peerSet.map((peer, index) => RequestPromise({
    method: 'post',
    uri: url.resolve(peer.accessPoint + ':' + wo.Config.port, '/api' + api),
    body: message,
    json: true
  }).catch(function (err) {
    mylog.info('广播 ' + api + ' 到某个节点出错: ' + err.message)
    return null  // 其中一个节点出错，必须要在其catch里返回null，否则造成整个Promise.all出错进入catch了。
  }))).catch(console.log)
  return result
}

Peers.randomcast = async function (api, message, peerSet) { // 随机挑选一个节点发出请求，返回结果。可通过 peerSet 参数指定广播对象。
  peerSet = peerSet || Object.values(await my.getPeers())
  var peer = peerSet[wo.Crypto.randomNumber({ max: peerSet.length })]
  if (peer instanceof Peers) {
    var result = await RequestPromise({
      method: 'post',
      uri: url.resolve(peer.accessPoint + ':' + wo.Config.port, '/api' + api),
      body: message,
      json: true
    }).catch(function (err) { mylog.info('点播 ' + api + ' 到随机节点出错: ' + err.message); return null })
    return result
  }
  return null
}

Peers.addPeer2Pool = async function (peerData) { // 把peer原始数据转成peer对象，存入节点池(数组)
  var peer = new Peers(peerData)
  if (peer.ownerAddress !== wo.Crypto.secword2address(wo.Config.ownerSecword) // 不要把自己作为邻居加给自己
    && !my.peerAddressArray[peer.ownerAddress]) { // 并且尚未添加过该节点主人地址
    my.pushPeerPool(peer)
  }
  return peer
}

Peers._init = async function () {
  if (wo.Config.seedSet && Array.isArray(wo.Config.seedSet) && wo.Config.seedSet.length > 0) {
    // 建立种子节点库
    for (var seed of wo.Config.seedSet) {
      mylog.info('add:', url.resolve(seed + ':' + wo.Config.port, '/api/Peers/ping'))
      await RequestPromise({
        method: 'post',
        uri: url.resolve(seed + ':' + wo.Config.port, '/api/Peers/ping'),
        body: { Peer: JSON.stringify(my.self.setProp()) }, // 告诉对方，我是谁，以及发出ping的时间
        json: true
      }).then(async function (result) {
        return await Peers.addPeer2Pool({ accessPoint: seed, ownerAddress: result.remoteAddress })
      }).catch(function (err) {
        mylog.error(err)
        return null
      })
    }
    // 建立邻居节点库
    var peerSetArray = await Peers.broadcast('/Peers/sharePeer', { Peer: JSON.stringify(my.self) })
    for (let peerSet of peerSetArray) {
      for (var peer of peerSet || []) {
        await Peers.addPeer2Pool(peer)
      }
    }  
  
    my.scheduleJob[0] = Schedule.scheduleJob(`*/${wo.Config.PEER_CHECKING_PERIOD} * * * * *`, this.updatePool)
    // setInterval(this.updatePool, wo.Config.PEER_CHECKING_PERIOD) 
    // 多久检查一个节点？假设每个节点有12个peer，5秒检查一个，1分钟可检查一圈。而且5秒足够ping响应。
  }
  return this
}

Peers.api = {} // 对外可RPC调用的方法
Peers.api.ping = async function (option) { // 响应邻居节点发来的ping请求。
  if (option && option.Peer && option.Peer.ownerAddress) {
    // 记录发来请求的节点到 fromPeerPool
    var req = option._req
    var fromHost = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress
    var fromPort = req.connection.remotePort
    if (!my.peerAddressArray[option.Peer.ownerAddress]) { // 是新邻居发来的ping？把新邻居加入节点池
      option.Peer.fromHost = fromHost
      option.Peer.fromPort = fromPort
      option.Peer.remoteAddress = wo.Crypto.secword2address(wo.Config.ownerSecword) // 把本地节点（我）的地址也告知远方节点
      await my.pushPeerPool(new Peers(option.Peer))
    }
    option.Peer.lastResponse = Date.now() // 记录我发回response的时间
    return option.Peer // 把远方节点的信息添加一些资料后，返回给远方节点
  }
  mylog.info('节点记录失败');
  return null
}

Peers.api.sharePeer = async function (option) { // 响应邻居请求，返回更多节点。option.Peer是邻居节点。
  return Object.values(await my.getPeers()||{}) // todo: 检查 option.Peer.ownerAddress 不要把邻居节点返回给这个邻居自己。
}

const my = {}
my.scheduleJob = []
// my.self = new Peers({ ownerAddress: wo.Crypto.secword2address(wo.Config.ownerSecword), accessPoint: wo.Config.protocol + '://' + wo.Config.host + ':' + wo.Config.port })
my.self = new Peers({ ownerAddress: wo.Crypto.secword2address(wo.Config.ownerSecword), accessPoint: wo.Config.protocol + '://' + wo.Config.host})
my.peerAddressArray = []

my.shiftPeerPool = async function (ary = my.peerAddressArray) {
  let address = ary.shift()
  let peer = JSON.parse(await store.hget('peers', address))
  if (peer) {
    store.hdel('peers', address);
    return peer;
  }
  return null
}
my.pushPeerPool = async function (peer, ary = my.peerAddressArray) {
  if (my.peerAddressArray.indexOf(peer.ownerAddress) === -1) {
    ary.push(peer.ownerAddress);
    await store.hset('peers', peer.ownerAddress, JSON.stringify(peer));
    return peer
  }
  return null
}
my.getPeers = async function (address) {
  if (address)
    return JSON.parse((await store.hget('peers', address)));
  let peers = await store.hgetall('peers');
  let keys = Object.keys(peers);
  for (let peer of keys) {
    peers[peer] = JSON.parse(peers[peer])
  }
  return peers
}