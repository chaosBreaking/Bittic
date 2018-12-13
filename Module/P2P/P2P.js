const Ling = wo.Ling
const url = require('url');
const Schedule = require('node-schedule');
const RequestPromise = require('request-promise-native'); // request-promise/-native。https://www.npmjs.com/package/request-promise. 还看到一个方法：Bluebird.promisifyAll(require("request"));
const store = require('../../util/StoreApi.js')('redis')

class Peers extends Ling {
  constructor(prop) {
    super(prop)
    this._class = this.constructor.name;
    this.setProp(prop);
  }
}

Peers.prototype._tablekey = 'ownerAddress'
Peers.prototype._model = { // 数据模型，用来初始化每个对象的数据
  ownerAddress:   { default: '' }, // 应当记录属于哪个用户，作为全网每个节点的唯一标志符
  accessPoint:    { default: '' }, // 该节点的http连接地址。
  host:           { default: '' }, // IP or hostname like http://remoteaddress.com or http://101.222.121.111
  port:           { default: '6842' }, //共识协议交流端口
  consPort:       { default: '6888' }, //共识协议交流端口
  status:         { default: 'unknown' }, // unknown是刚加入pool时未知状态。开始检查后，状态是 active, broken, dead
  checking:       { default: 'idle' }, // idle 或 pending
  lastRequest:    { default: '' }, // 上一次 ping 请求的时间
  lastResponse:   { default: '' }, // 上一次 ping 回复的时间
  lastReception:  { default: '' }, // 上一次 ping 收到回复的时间
  brokenCount:    { default: 0 }
}

const my = {}
my.scheduleJob = []
my.peerAddressArray = []
my.self = new Peers({
  ownerAddress: wo.Crypto.secword2address(wo.Config.ownerSecword),
  accessPoint: wo.Config.protocol + '://' + wo.Config.host,
  host: wo.Config.host,
  port: wo.Config.webPort,      //web服务端口
})

getUrl = function (peer) {
  if(peer && peer.accessPoint)
    return peer.accessPoint + ':' + (peer.port ? peer.port : wo.Config.port)
  if(peer.split(":")[1])
    return peer
  else
    return peer + ':' + (peer.port ? peer.port : wo.Config.port)
}

Peers._init = async function () {
  // 建立种子节点库
  if (wo.Config.seedSet && Array.isArray(wo.Config.seedSet) && wo.Config.seedSet.length > 0) {
    mylog.info('初始化种子节点')
    await Promise.all(wo.Config.seedSet.map((peer, index) => {
      return RequestPromise({
        method: 'post',
        uri: url.resolve(getUrl(peer), '/api/P2P/ping'),
        body: { Peer: JSON.stringify(my.self) }, // 告诉对方，我是谁，以及发出ping的时间
        json: true
      }).then(async function (result) {
        return await Peers.addPeer2Pool(Object.assign(result, { accessPoint: peer, ownerAddress: result.remoteAddress }))
      }).catch(function (err) {
        return null
      })
    }))
    // 建立邻居节点库
    mylog.info('补充邻居节点')
    let peers = Object.values(await this.getPeers())
    if(peers && peers.length > 0)
      await Promise.all(peers.map((peer, index) => {
        return RequestPromise({
          method: 'post',
          uri: url.resolve(getUrl(peer), '/api/P2P/sharePeer'),
          body: {}, // 告诉对方，我是谁，以及发出ping的时间
          json: true
        }).then(async peerArray => {
          await Peers.addPeer2Pool(peerArray);
        }).catch(err => {mylog.warn('获取节点失败')})
      }))
    my.scheduleJob[0] = Schedule.scheduleJob(`*/59 * * * * *`, Peers.updatePool)
    // setInterval(Peers.updatePool, wo.Config.PEER_CHECKING_PERIOD) 
    // 多久检查一个节点？假设每个节点有12个peer，5秒检查一个，1分钟可检查一圈。而且5秒足够ping响应。
  }
  return this
}

Peers.updatePool = async function () { // 从节点池取出第一个节点，测试其连通性，把超时无响应的邻居从池中删除。
  mylog.info('update peer pool')
  let peer = null
  while (!peer) {
    peer = await Peers.shiftPeerPool() // 每次取出第一个节点进行检查
    if (peer && peer.checking === 'pending') {
      await Peers.pushPeerPool(peer);
      peer = null;
    }
  }
  if (peer && peer.status !== 'dead') { // 是当前还有效的peer。如果已经dead，就不再执行，即不放回 pool 了。
    peer.checking = 'pending' // 正在检查中，做个标记，以防又重复被检查
    peer.lastRequest = new Date() // 发起ping的时刻 
    var result = await RequestPromise({
      method: 'post',
      uri: url.resolve(getUrl(peer), '/api/P2P/ping'),
      body: { Peer: JSON.stringify(my.self) }, // 告诉对方，我是谁，以及发出ping的时间
      json: true
    }).catch(function (err) {});
    if (result) { // 对方peer还活着
      // mylog.info('收到节点响应',peer.accessPoint)
      peer.status = 'active'
      peer.lastResponse = result.lastResponse // 对方响应ping的时刻
      peer.lastReception = new Date() // 收到对方ping的时刻
      peer.brokenCount = 0
    }
    else { // 对方peer无响应
      if (['active', 'unknown'].indexOf(peer.status) >= 0) {
        mylog.info(peer.accessPoint,'无法ping通',peer.status,'设为断线状态')
        peer.status = 'broken' // 第一次ping不通，设为断线状态
        peer.brokenCount += 1;
        mylog.info('节点无响应：' + peer.ownerAddress + peer.accessPoint)
      }
      else if (peer.status === 'broken') { // 持续 5分钟无法ping通
        if (peer.brokenCount >= wo.Config.PEER_CHECKING_TIMEOUT) {
          mylog.info('节点已超时，即将删除：' + JSON.stringify(peer))
          Peers.delPeer(peer.ownerAddress)
          return 0
        }
      }
    }
    peer.checking = 'idle'
    await Peers.pushPeerPool(peer) // 先放到最后，以防错过检查期间的broadcast等。如果已经是link=dead，就不放回去了。
  }

  // 补充一个新邻居
  if (my.peerAddressArray.length < wo.Config.PEER_POOL_CAPACITY) {
    let peerSet = await Peers.randomcast('/P2P/sharePeer', { Peer: JSON.stringify(my.self) }) // 先向邻居池 peerPool 申请
    //      || await Peers.randomcast('/Peer/sharePeer',{Peer:my.self},my.seedSet) // 也许邻居池为空，那就向种子节点申请。
    if (peerSet && peerSet.length > 0) {
      await Peers.addPeer2Pool(peerSet[wo.Crypto.randomNumber({ max: peerSet.length })]) // 随机挑选一个节点加入邻居池
    }
  }
}

Peers.broadcast = async function (api, message, peers) { // api='/类名/方法名'  向所有邻居发出广播，返回所有结果的数组。可通过 peerSet 参数指定广播对象。
  let peerSet = peers || Object.values(await Peers.getPeers());
  mylog.info(`广播调用${api}`)
  if (peerSet && peerSet.length > 0) {
    let res = await Promise.all(peerSet.map(peer => RequestPromise({
      method: 'post',
      uri: url.resolve(getUrl(peer), '/api' + api),
      body: message,
      json: true
    }).catch(function (err) {
      mylog.info('广播 ' + api + ' 到某个节点出错: ' + err.message)
      return null  // 其中一个节点出错，必须要在其catch里返回null，否则造成整个Promise.all出错进入catch了。
    }))).catch(() => console.log("广播失败"))
    return res
  }
}

Peers.randomcast = async function (api, message, peers) { // 随机挑选一个节点发出请求，返回结果。可通过 peerSet 参数指定广播对象。
  let peerSet = peers || Object.values(await Peers.getPeers());
  if (peerSet && peerSet.length > 0) {
    var peer = peerSet[wo.Crypto.randomNumber({ max: peerSet.length })];
    if (peer && peer.accessPoint) {
      mylog.info(`点播调用${api} 到 ${getUrl(peer)} `)
      var res = await RequestPromise({
        method: 'post',
        uri: url.resolve(getUrl(peer), '/api' + api),
        body: message,
        json: true
      }).catch(function (err) { mylog.info('点播 ' + api + ' 到随机节点出错: ' + err.message); return null })
      return res
    }
  }
  return null
}

/**
 *
 * @desc 检查传入节点的信息是否合法，但不检查节点池是否已经存在该节点
 * @param {Peer} peer
 * @returns {boolean}
 */
Peers.checkValid = function (peer) {
  if (
    !peer.p2pPort ||
    !peer.accessPoint || 
    !peer.ownerAddress ||
    peer.ownerAddress == my.self.ownerAddress ||
    peer.accessPoint.includes('192.168') || 
    peer.accessPoint.includes('localhost') || 
    peer.accessPoint.includes('127.0')
  )
    return false
  return true
}
/**
 * @method
 * @param {string} ownerAddress
 * @returns {Peer} peer
 * @desc 从节点集合里不放回的取出一个节点(未指定ownerAddress时则取出最后一个)
 */
Peers.shiftPeerPool = async function (ownerAddress) {
  if(ownerAddress){
    my.peerAddressArray.splice(my.peerAddressArray.indexOf(ownerAddress),1)
    await store.hdel('peers', ownerAddress);
    return peer
  }
  let address = my.peerAddressArray.shift()
  let peer = JSON.parse(await store.hget('peers', address))
  if (peer) {
    store.hdel('peers', address);
    return peer
  }
  return null
}

Peers.addPeer2Pool = async function (peerData) { // 把peer原始数据转成peer对象，存入节点池(数组)
  if (!Array.isArray(peerData)) {
    var peer = new Peers(peerData);
    await Peers.pushPeerPool(peer);
    return peer
  }
  else {
    for (let peer of peerData) {
      try {
        await Peers.pushPeerPool(typeof peer === 'string' ? JSON.parse(peer) : peer);
      } catch (error) {
        return error
      }
      return peerData
    }
  }
}

/**
 *
 * @desc 检查一个传入节点的合法性后加入节点池
 * @param {Peer} peer
 * @returns {Peer} peer
 */
Peers.pushPeerPool = async function (peer) {
  if (this.checkValid(peer) && my.peerAddressArray.indexOf(peer.ownerAddress) === -1) {
    my.peerAddressArray.push(peer.ownerAddress);
    await store.hset('peers', peer.ownerAddress, JSON.stringify(peer));
    return peer
  }
  return null
}

/**
 *
 * @desc 获取所有节点或给定地址的某个节点
 * @param {string} ownerAddress
 * @returns
 */
Peers.getPeers = async function (ownerAddress) {
  if (ownerAddress)
    return JSON.parse((await store.hget('peers', ownerAddress)));
  let peers = await store.hgetall('peers');
  let keys = Object.keys(peers);
  for (let peer of keys) {
    peers[peer] = JSON.parse(peers[peer]);
  }
  return peers
}
Peers.delPeer = async function (ownerAddress) {
  if (ownerAddress) {
    return await store.hdel('peers', ownerAddress)
  }
  return null
}
Peers.api = {} // 对外可RPC调用的方法

/**
 *
 * @desc 响应邻居节点发来的ping请求,如果是新节点则加入自身节点池
 * @param {*} option
 * @returns {Peer} my.self
 */
Peers.api.ping = async function (option) {
  if (option && option.Peer && Peers.checkValid(option.Peer)) {
    let isNewPeer = !my.peerAddressArray[option.Peer.ownerAddress]
    if (isNewPeer) { // 是新邻居发来的ping？把新邻居加入节点池
      var fromHost = option._req.headers['x-forwarded-for'] || option._req.connection.remoteAddress || option._req.socket.remoteAddress || option._req.connection.socket.remoteAddress
      var fromPort = option._req.connection.remotePort
      await Peers.pushPeerPool(new Peers(option.Peer))
      mylog.info(`加入新节点 -- ${option.Peer.ownerAddress}-${option.Peer.accessPoint}`)
    }
    return my.self // 把远方节点的信息添加一些资料后，返回给远方节点
  }
  mylog.warn('节点记录失败：错误的节点信息');
  return null
}

Peers.api.getMyInfo = async function () {
  return my
}

Peers.api.sharePeer = async function () { // 响应邻居请求，返回更多节点。option.Peer是邻居节点。
  let res = Object.values(await Peers.getPeers() || {}) // todo: 检查 option.Peer.ownerAddress 不要把邻居节点返回给这个邻居自己。
  return res
}
Peers.api.test = function() {
  console.log('ok')
  return 'ok'
}
module.exports = {
  api: Peers.api,
  _init: Peers._init,
  getPeers: Peers.getPeers,
  broadcast: Peers.broadcast,
  randomcast: Peers.randomcast,
}
