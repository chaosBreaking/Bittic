const Ling = require('fon.ling')
const url = require('url')
const Schedule = require('node-schedule')
const RequestPromise = require('request-promise-native') // request-promise/-native。https://www.npmjs.com/package/request-promise. 还看到一个方法：Bluebird.promisifyAll(require("request"))
const store = require('../util/StoreApi.js')('redis')

const DAD = module.exports = class Peer extends Ling {
  constructor (prop) {
    super(prop)
    this._class = this.constructor.name
    this.setProp(prop)
  }
}

DAD.prototype._tablekey = 'ownerAddress'
DAD.prototype._model = { // 数据模型，用来初始化每个对象的数据
  ownerAddress: { default: '' }, // 应当记录属于哪个用户，作为全网每个节点的唯一标志符
  accessPoint: { default: '' }, // 该节点的http连接地址。
  host: { default: '' }, // IP or hostname like http://remoteaddress.com or http://101.222.121.111
  port: { default: wo.Config.port }, // 共识协议交流端口
  status: { default: 'unknown' }, // unknown是刚加入pool时未知状态。开始检查后，状态是 active, broken, dead
  checking: { default: 'idle' }, // idle 或 pending
  lastRequest: { default: '' }, // 上一次 ping 请求的时间
  lastResponse: { default: '' }, // 上一次 ping 回复的时间
  lastReception: { default: '' }, // 上一次 ping 收到回复的时间
  brokenCount: { default: 0 }
}

const my = {}
my.scheduleJob = []
my.self = new DAD({
  ownerAddress: wo.Crypto.secword2address(wo.Config.ownerSecword),
  accessPoint: wo.Config.protocol + '://' + wo.Config.host + ':' + wo.Config.port,
  protocol: wo.Config.protocol,
  host: wo.Config.host,
  port: wo.Config.port // web服务端口
})

DAD._init = async function () {
  // 建立种子节点库
  if (wo.Config.seedSet && Array.isArray(wo.Config.seedSet) && wo.Config.seedSet.length > 0) {
    mylog.info('初始化种子节点')
    await Promise.all(wo.Config.seedSet.map((peerUrl, index) => {
      mylog.info(`查询种子地址：${peerUrl}`)
      return RequestPromise({
        method: 'post',
        uri: url.resolve(peerUrl, '/api/Peer/ping'),
        body: { Peer: JSON.stringify(my.self) }, // 告诉对方，我是谁，以及发出ping的时间
        json: true
      }).then(async function (peer) {
        mylog.info(`获得种子反馈：${JSON.stringify(peer)}`)
        if (DAD.isValid(peer)) { await DAD.addPeer(peer) }
      }).catch(function (err) {
        mylog.warn(`无法连通种子节点：${peerUrl}，错误提示：${err.message}`)
      })
    }))
    // 建立邻居节点库
    mylog.info('补充邻居节点')
    let peers = await this.getPeerList()
    if (peers && peers.length > 0) {
      await Promise.all(peers.map((peer, index) => {
        return RequestPromise({
          method: 'post',
          uri: url.resolve(peer.accessPoint, '/api/Peer/getPeerList'),
          body: { Peer: JSON.stringify(my.self) }, // 告诉对方，我是谁
          json: true
        }).then(async peerArray => {
          for (let peer of peerArray) {
            await DAD.addPeer(peer)
          }
        }).catch(err => {
          mylog.warn('获取邻居节点失败')
        })
      }))
    }
    // setInterval(DAD.updatePool, wo.Config.PEER_CHECKING_PERIOD)
    // 多久检查一个节点？假设每个节点有12个peer，5秒检查一个，1分钟可检查一圈。而且5秒足够ping响应。
  }
  my.scheduleJob[0] = Schedule.scheduleJob({ second: wo.Config.PEER_CHECKING_PERIOD }, DAD.updatePool)
  return this
}

DAD.updatePool = async function () { // 一次性检查节点池里所有节点，测试其连通性，把超时无响应的邻居从池中删除。
  mylog.info('updating peer pool')
  let peerSet = await DAD.getPeerList()
  let resultArray = await Promise.all(peerSet.map(async peer => {
    mylog.info(`Checking ${peer.accessPoint}......`)
    if (peer && peer.checking !== 'pending') { // 是当前还有效的peer。如果已经dead，就不再执行，即不放回 pool 了。
      peer.checking = 'pending' // 正在检查中，做个标记，以防又重复被检查
      peer.lastRequest = new Date() // 发起ping的时刻
      return await RequestPromise({
        method: 'post',
        uri: url.resolve(peer.accessPoint, '/api/Peer/ping'),
        body: { Peer: JSON.stringify(my.self) }, // 告诉对方，我是谁，以及发出ping的时间
        json: true
      }).then(function (result) {
        if (result) { // 对方peer还活着
          mylog.info(`节点 ${peer.accessPoint} 成功返回 ${JSON.stringify(result)}`)
          peer.status = 'active'
          peer.lastResponse = result.lastResponse // 对方响应ping的时刻
          peer.lastReception = new Date() // 收到对方ping的时刻
          peer.brokenCount = 0
          return peer
        } else { // 对方返回 null
          mylog.warn(`节点 ${peer.accessPoint} 返回 null，请检查异常`)
          return null
        }
      }).catch(function (err) {
        mylog.warn(`节点 ${peer.accessPoint} 无响应：${err.message}`)
        if (['active', 'unknown'].indexOf(peer.status) >= 0) {
          mylog.info(peer.accessPoint, '无法ping通', peer.status, '设为断线状态')
          peer.status = 'broken' // 第一次ping不通，设为断线状态
          peer.brokenCount += 1
          mylog.warn(`节点 ${peer.accessPoint} 转入 broken 状态`)
        } else if (peer.status === 'broken') {
          if (peer.brokenCount < wo.Config.PEER_CHECKING_TIMEOUT) {
            peer.brokenCount += 1
            mylog.warn(`节点 ${peer.accessPoint} 连续 ${peer.brokenCount} 次无响应`)
          } else {
            mylog.error(`节点 ${peer.accessPoint} 已超过 ${wo.Config.PEER_CHECKING_TIMEOUT} 次无响应，删除出节点池`)
            DAD.dropPeer(peer.ownerAddress)
          }
        }
        return undefined
      })
      peer.checking = 'idle'
    }
    return resultArray
  }))

  // 补充新邻居 // todo: 每次不该只加一个，而是要加满 PEER_POOL_CAPACITY
  if (await DAD.getPeerNumber() < wo.Config.PEER_POOL_CAPACITY) {
    let newPeerSet = await DAD.randomcast('/Peer/getPeerList', { Peer: JSON.stringify(my.self) }) // 先向邻居池 peerPool 申请
    if (newPeerSet && newPeerSet.length > 0) {
      await DAD.addPeer(newPeerSet[wo.Crypto.randomNumber({ max: newPeerSet.length })]) // 随机挑选一个节点加入邻居池
    }
  }
}

DAD.broadcast = async function (api, message, peerSet) { // api='/类名/方法名'  向所有邻居发出广播，返回所有结果的数组。可通过 peerSet 参数指定广播对象。
  peerSet = peerSet || await DAD.getPeerList()
  mylog.info(`广播调用${api}`)
  if (peerSet && peerSet.length > 0) {
    let res = await Promise.all(peerSet.map(peer => RequestPromise({
      method: 'post',
      uri: url.resolve(peer.accessPoint, '/api' + api),
      body: message,
      json: true
    }).catch(function (err) {
      mylog.info('广播 ' + api + ' 到某个节点出错: ' + err.message)
      return null // 其中一个节点出错，必须要在其catch里返回null，否则造成整个Promise.all出错进入catch了。
    }))).catch(() => console.log('广播失败'))
    return res
  }
}

DAD.randomcast = async function (api, message, peerSet) { // 随机挑选一个节点发出请求，返回结果。可通过 peerSet 参数指定广播对象。
  peerSet = peerSet || await DAD.getPeerList()
  if (peerSet && peerSet.length > 0) {
    var peer = peerSet[wo.Crypto.randomNumber({ max: peerSet.length })]
    if (peer && peer.accessPoint) {
      mylog.info(`随机点播调用 ${peer.accessPoint}/api/${api}`)
      return await RequestPromise({
        method: 'post',
        uri: url.resolve(peer.accessPoint, '/api' + api),
        body: message,
        json: true
      }).catch(function (err) {
        mylog.info(`随机点播调用 ${peer.accessPoint}/api/${api}} 出错： ${err.message}`)
        return null
      })
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
DAD.isValid = function (peer) {
  if (
    !peer.port ||
    !peer.accessPoint ||
    !peer.ownerAddress ||
    peer.ownerAddress == my.self.ownerAddress ||
    // peer.accessPoint.includes('192.168') ||
    peer.accessPoint.includes('localhost') ||
    peer.accessPoint.includes('127.0')
  ) { return false }
  return true
}

/**
 *
 * @desc 检查一个传入节点的合法性后加入节点池
 * @param {Peer} peer
 * @returns {Peer} peer
 */
DAD.addPeer = async function (peer) {
  if (this.isValid(peer) && !(await DAD.hasPeer(peer.ownerAddress))) {
    await store.hset('peers', peer.ownerAddress, JSON.stringify(peer))
    return peer
  }
  return null
}
DAD.dropPeer = async function (ownerAddress) {
  if (ownerAddress) {
    return await store.hdel('peers', ownerAddress)
  }
  return null
}
DAD.hasPeer = async function (ownerAddress) {
  if (ownerAddress) {
    let peers = await store.hgetall('peers')
    if (peers && peers[ownerAddress]) {
      return true
    }
  }
  return false
}

DAD.api = {} // 对外可RPC调用的方法

/**
 *
 * @desc 响应邻居节点发来的ping请求,如果是新节点则加入自身节点池
 * @param {*} option
 * @returns {Peer} my.self
 */
DAD.api.ping = async function (option) {
  if (option && option.Peer && DAD.isValid(option.Peer)) {
    if (!(await DAD.hasPeer(option.Peer.ownerAddress))) { // 是新邻居发来的ping？把新邻居加入节点池
      // var fromHost = option._req.headers['x-forwarded-for'] || option._req.connection.remoteAddress || option._req.socket.remoteAddress || option._req.connection.socket.remoteAddress
      // var fromPort = option._req.connection.remotePort
      // option.Peer.host = fromHost
      // option.Peer.port = fromPort
      await DAD.addPeer(new DAD(option.Peer))
      mylog.info(`加入新节点: ${option.Peer.accessPoint} of owner ${option.Peer.ownerAddress}`)
    }
    return my.self // 把远方节点的信息添加一些资料后，返回给远方节点
  }
  mylog.warn('节点记录失败：错误的节点信息')
  return null
}

DAD.api.getInfo = function () {
  return my.self
}

DAD.getPeerNumber = DAD.api.getPeerNumber = async function () {
  let peerDict = await store.hgetall('peers')
  return Object.keys(peerDict).length
}

/**
 *
 * @desc 获取所有节点或给定地址的某个节点
 * @param {string} ownerAddress
 * @returns
 */
DAD.getPeerList = DAD.api.getPeerList = async function (option) {
  let peerDict = await store.hgetall('peers')
  let peerList = []
  let excludeAddress = (option && option.Peer && option.Peer.ownerAddress) ? option.Peer.ownerAddress : undefined
  for (let ownerAddress in peerDict) {
    if (ownerAddress !== excludeAddress) { // 如果是另一个节点发起调用，另一个节点可以附上自己的信息，那么返回值里不要包含另一个节点
      peerList.push(JSON.parse(peerDict[ownerAddress]))
    }
  }
  return peerList
}
