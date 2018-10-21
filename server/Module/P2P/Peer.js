const Ling = wo.Ling
const RequestPromise=require('request-promise-native'); // request-promise/-native。https://www.npmjs.com/package/request-promise. 还看到一个方法：Bluebird.promisifyAll(require("request"));
const url=require('url')

/******************** Public of instances ********************/

const DAD=module.exports=function Peer(prop) {
  this._class=this.constructor.name
  this.setProp(prop)
}
DAD.__proto__=Ling
const MOM=DAD.prototype
MOM.__proto__=Ling.prototype

/******************** Shared by instances ********************/
MOM._tablekey='hash'
MOM._model={ // 数据模型，用来初始化每个对象的数据
  ownerAddress: {default:''}, // 应当记录属于哪个用户，作为全网每个节点的唯一标志符
  accessPoint: {default:''}, // 该节点的http连接地址。
  fromHost: {default:''}, // IP or hostname // 该节点连接我时，使用的远程主机
  fromPort: {default:''}, // 该节点连接我时，使用的远程端口
  link: {default:'unknown'}, // unknown是刚加入pool时未知状态。开始检查后，状态是 active, broken, dead
  checking: {default:'idle'}, // idle 或 pending
  lastRequest: {default:''}, // 上一次 ping 请求的时间
  lastResponse: {default:''}, // 上一次 ping 回复的时间
  lastReception: {default:''}, // 上一次 ping 收到回复的时间
  brokenCount: {default:0}
}

/*********************** Public of class *********************/
DAD.api={} // 面向前端应用的API

DAD.api.ping=function(option) { // 响应邻居节点发来的ping请求。
  if (option && option.Peer && option.Peer.ownerAddress){
    
    // 记录发来请求的节点到 fromPeerPool
    var req=option._req
    var fromHost=req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress
    var fromPort=req.connection.remotePort
    if (!my.peerAddressArray[option.Peer.ownerAddress]) { // 是新邻居发来的ping？把新邻居加入节点池
      option.Peer.fromHost=fromHost
      option.Peer.fromPort=fromPort
      option.Peer.remoteAddress=wo.Crypto.secword2address(wo.Config.ownerSecword) // 把本地节点（我）的地址也告知远方节点
      my.pushPeerPool(new DAD(option.Peer))
//      my.fromPeerPool[option.Peer.ownerAddress]=new DAD(option.Peer) 
//      my.toPeerPool.push(my.fromPeerPool[option.Peer.ownerAddress])
    }
//    mylog.info(JSON.stringify(my.toPeerPool))
    option.Peer.lastResponse=Date.now() // 记录我发回response的时间
    return option.Peer // 把远方节点的信息添加一些资料后，返回给远方节点
  }
  mylog.info('节点记录失败');
  return null
}

DAD.api.sharePeer=function(option) { // 响应邻居请求，返回更多节点。option.Peer是邻居节点。
  return Object.values(my.peerAddressDict) // todo: 检查 option.Peer.ownerAddress 不要把邻居节点返回给这个邻居自己。
}

DAD.updatePool=async function() { // 从节点池取出第一个节点，测试其连通性，把超时无响应的邻居从池中删除。
//    mylog.info('peerPool='+JSON.stringify(my.toPeerPool))
  let peer=null
  if (my.peerAddressArray[0] && my.peerAddressDict[my.peerAddressArray[0]].checking!=='pending'){
    peer=my.shiftPeerPool() // 每次取出第一个节点进行检查
//    mylog.info('取出一个peer='+JSON.stringify(peer))
  }
  if (peer && peer.link!=='dead') { // 是当前还有效的peer。如果已经dead，就不再执行，即不放回 pool 了。
    my.pushPeerPool(peer) // 先放到最后，以防错过检查期间的broadcast等。如果已经是link=dead，就不放回去了。
    peer.checking='pending' // 正在检查中，做个标记，以防又重复被检查
    peer.lastRequest=Date.now() // 发起ping的时刻 
    var result=await RequestPromise({
      method:'post',
      uri: url.resolve(peer.accessPoint, '/api/Peer/ping'), 
      body:{Peer:JSON.stringify(my.self.setProp({lastRequest:peer.lastRequest}))}, // 告诉对方，我是谁，以及发出ping的时间
      json:true
    }).catch(function(err){
//        mylog.warn('WARNING : ping has no response from '+peer.ip)
      return null
    })
//    mylog.info('http://'+peer.ip+':'+peer.port+'/Peer/ping' + ' =》 '+result)
    if (result && result.lastRequest===peer.lastRequest){ // 对方peer还活着
      peer.link='active'
      peer.lastResponse=result.lastResponse // 对方响应ping的时刻
      peer.lastReception=Date.now() // 收到对方ping的时刻
      peer.brokenCount = 0
      // todo: 做一些统计工作，计算所有ping的平均值，等等
    }else{ // 对方peer无响应
      if (['active','unknown'].indexOf(peer.link)>=0){
        peer.link='broken' // 第一次ping不通，设为断线状态
//        peer.lastResponse=null
//        peer.lastReception=null
        mylog.info('节点无响应：'+JSON.stringify(peer))
      }else if (peer.link==='broken') { // 持续 5分钟无法ping通
        peer.brokenCount++
        if( peer.brokenCount>wo.Config.PEER_CHECKING_TIMEOUT){
          peer.link='dead' // 连续两次无法ping通，就不要了 
          mylog.info('节点已超时，即将删除：'+JSON.stringify(peer))
        }
      }
    }
    peer.checking='idle'
  }
  
  // 补充一个新邻居
  if (my.peerAddressArray.length<wo.Config.PEER_POOL_CAPACITY){
    let peerSet=await DAD.randomcast('/Peer/sharePeer',{Peer: JSON.stringify(my.self)}) // 先向邻居池 peerPool 申请
//      || await DAD.randomcast('/Peer/sharePeer',{Peer:my.self},my.seedSet) // 也许邻居池为空，那就向种子节点申请。
    if (peerSet && peerSet.length>0) {
      DAD.addPeer2Pool(peerSet[wo.Crypto.randomNumber({max:peerSet.length})]) // 随机挑选一个节点加入邻居池
    }
  }
}

DAD.broadcast=async function(api, message, peerSet){ // api='/类名/方法名'  向所有邻居发出广播，返回所有结果的数组。可通过 peerSet 参数指定广播对象。
  peerSet=peerSet||Object.values(my.peerAddressDict)
  var result= await Promise.all(peerSet.map((peer, index) => RequestPromise({
    method: 'post',
    uri: url.resolve(peer.accessPoint, '/api'+api),
    body: message,
    json: true
  }).catch(function(err){ 
    mylog.info('广播 '+api+' 到某个节点出错: '+err.message)
    return null  // 其中一个节点出错，必须要在其catch里返回null，否则造成整个Promise.all出错进入catch了。
  }))).catch(console.log)
//  console.log(result)
  return result
}

DAD.randomcast=async function(api, message, peerSet){ // 随机挑选一个节点发出请求，返回结果。可通过 peerSet 参数指定广播对象。
  peerSet=peerSet||Object.values(my.peerAddressDict)
  var peer=peerSet[wo.Crypto.randomNumber({max:peerSet.length})]
  if (peer instanceof DAD) {
    var result= await RequestPromise({
      method: 'post',
      uri: url.resolve(peer.accessPoint, '/api'+api), 
      body: message,
      json: true
    }).catch(function(err){ mylog.info('点播 '+api+' 到随机节点出错: '+err.message); return null})
    return result
  }
  return null
}

DAD.addPeer2Pool=async function (peerData){ // 把peer原始数据转成peer对象，存入节点池(数组)
  var peer=new DAD(peerData)
  if (peer.ownerAddress!==wo.Crypto.secword2address(wo.Config.ownerSecword) // 不要把自己作为邻居加给自己
      && !my.peerAddressArray[peer.ownerAddress]) { // 并且尚未添加过该节点主人地址
    my.pushPeerPool(peer)
  }
  return peer
}

DAD._init=async function(port){
  if (wo.Config.seedSet && Array.isArray(wo.Config.seedSet)){
    // 建立种子节点库
    for (var seed of wo.Config.seedSet){
      let list = seed.split(":")
      list.pop()
      list.push(wo.Config.port);
      seed = list.join(":")
      await RequestPromise({
        method:'post',
        uri: url.resolve(seed, '/api/Peer/ping'), 
        body:{ Peer:JSON.stringify(my.self.setProp()) }, // 告诉对方，我是谁，以及发出ping的时间
        json:true
      }).then(async function(result){
        return await DAD.addPeer2Pool({accessPoint:seed, ownerAddress:result.remoteAddress})
      }).catch(function(err){
  //        mylog.warn('WARNING : ping has no response from '+peer.ip)
        return null
      })
    }
    // 建立邻居节点库
    var peerSetArray=await DAD.broadcast('/Peer/sharePeer', { Peer:JSON.stringify(my.self) } )
    for (let peerSet of peerSetArray) {
      for (var peer of peerSet||[]) {
        await DAD.addPeer2Pool(peer)
      }
    }
    // my.toPeerPool = my.seedSet // todo: 准备删除本行。第一批邻居节点应当向种子节点请求获取。但目前为了简单，直接使用种子节点。
    // 持续更新邻居节点库
    setInterval(this.updatePool, wo.Config.PEER_CHECKING_PERIOD) // 多久检查一个节点？假设每个节点有12个peer，5秒检查一个，1分钟可检查一圈。而且5秒足够ping响应。
  }
  return this
}

/********************** Private in class *********************/
const my={}
my.self=new DAD({ ownerAddress:wo.Crypto.secword2address(wo.Config.ownerSecword), accessPoint:wo.Config.protocol+'://'+wo.Config.host+':'+wo.Config.port})

// todo: 完善数据结构，让每个节点都能从 ownerAddress 检索到。
// 例如， toPeerPool=[ ownerAddress1, ownerAddress2, ... ] 这样方便在 updatePeer 时，toPeerPool.shift/push
//       toPeerDict={ ownerAddress1: Peer1, ownerAddress2: Peer2, ... } 这样方便查找到 toPeerSet[ownerAddressX]
//       fromPeerDict={ ownerAddress1: Peer1, ... }

my.peerAddressArray=[]
my.peerAddressDict={}

my.shiftPeerPool=function(ary=my.peerAddressArray, obj=my.peerAddressDict){
  let address=ary.shift()
  let peer=obj[address]
  if (peer) {
    delete obj[address]
    return peer
  }
  return null
}

my.pushPeerPool=function(peer, ary=my.peerAddressArray, obj=my.peerAddressDict){
  if (!obj[peer.ownerAddress]){
    ary.push(peer.ownerAddress)
    obj[peer.ownerAddress]=peer
    return peer
  }
  return null
}