// 共识模块

const BigNumber=require('bignumber.js') // https://github.com/MikeMcl/bignumber.js  几个库的比较: node-bignum: 使用到openssl，在windows上需要下载二进制包，有时下载失败。bigi: 不错。 bignumber.js：不错。
const Schedule=require('node-schedule')

/******************** Public of instances ********************/

const DAD=module.exports=function ConsPotHard(prop) {
  this._class=this.constructor.name
//  this.setProp(prop)
}
//DAD.__proto__=Ling
const MOM=DAD.prototype
//MOM.__proto__=Ling.prototype

/******************** Shared by instances ********************/

/*********************** Public of class *********************/

DAD.api={}

// 第一阶段：签名
DAD.signOnce=function(){
  mylog('签名阶段开始 for block='+(wo.Chain.getTopBlock().height+2))+' using block='+wo.Chain.getTopBlock().height
  my.currentPhase='phase1'
  my.newSigPool=[]
  var message={ timestamp:Date.now(), blockHash:wo.Chain.getTopBlock().hash, pubkey:wo.Config.userAccount.pubkey }
  my.newSig=wo.Crypto.sign(JSON.stringify(message), wo.Config.userAccount.seckey)
  mylog('我的新签名是'+my.newSig)
//  setTimeout(function(){
    wo.Peer.broadcast('/Consensus/collectSignature', {signature:my.newSig, message:message}) // 把自己的签名发送给邻居
//  }, 2*1000) // 延时一会儿再发，避免让其他节点先收到签名再执行signing里的my.sigPool=[]
}
DAD.api.collectSignature=function(option){ // 监听收集邻居的签名
  // todo: verify signature and save it to sigPool
  if (my.currentPhase==='phase1'){ // 只有phase1才接收邻居签名；其他阶段不接收
    my.newSigPool.push(option.signature)
  }
}

// 第二阶段：出块，或监听上一轮获胜者打包广播的区块，
DAD.mineOnce=async function(){
  mylog('出块阶段开始 for block='+(wo.Chain.getTopBlock().height+1))+' using block='+wo.Chain.getTopBlock().height
  mylog('获胜签名='+my.bestSig)
  mylog('我的签名='+my.selfSig)
  my.currentPhase='phase2'
  if (my.selfSig && my.bestSig===my.selfSig) { // 上一轮的获胜者是我自己，于是打包并广播。注意防止 bestSig===selfSig===undefined，这是跳过竞选阶段直接从前两阶段开始会发生的。
    mylog('我是获胜者！')
    await wo.Chain.createBlock()
    wo.Peer.broadcast('/Consensus/shareBlock', {Block:wo.Chain.getTopBlock()})
  }else{
    mylog('我没有赢:(')
  }
  my.selfSig=my.newSig // 为下一轮竞选做准备
  my.sigPool=my.newSigPool
}
DAD.api.shareBlock=async function(option){ // 监听别人发来的区块
  if (my.currentPhase==='phase2' && option && option.Block && option.Block.hash!==wo.Chain.getTopBlock().hash) { // 注意不要接受我自己作为获胜者创建的块，以及不要重复接受已同步的区块
    if (await wo.Chain.addBlock(option.Block)){
      wo.Peer.broadcast('/Consensus/shareBlock', {Block:wo.Chain.getTopBlock()})
    }
  }
  return null
}

// 第三阶段：竞选（可以和下一轮的第一阶段同时进行）
DAD.distance=function(hash, sig){ // hash为64hex字符，sig为128hex字符。返回用hex表达的距离。
  if (wo.Crypto.isSignature(sig) && wo.Crypto.isHash(hash)){
    var hashSig=wo.Crypto.hash(sig) // 把签名也转成32字节的哈希，同样长度方便比较
    return new BigNumber(hash,16).minus(new BigNumber(hashSig,16)).abs().toString(16)
  }
  return null
}
DAD.compareSig=function(hash, sig1, sig2){ // 返回距离hash更近的sig
  if (wo.Crypto.isHash(hash) && wo.Crypto.isSignature(sig1) && wo.Crypto.isSignature(sig2)) {
    var dis1=this.distance(hash,sig1)
    var dis2=this.distance(hash,sig2)
    if (dis1<dis2) {
      return sig1
    }else if (dis1>dis2) {
      return sig2
    }else if (dis1===dis2) { // 如果极其巧合的距离相等，也可能是一个在左、一个在右，那就按 signature 本身的字符串排序来比较。
      return sig1<sig2 ? sig1 : sig1===sig2 ? sig1 : sig2
    }
  }
  return null
}
DAD.sortSigList=function(hash, sigList){
  if (Array.isArray(sigList)){
    sigList.sort(function(sig1, sig2){
      var winner=DAD.compareSig(hash, sig1, sig2)
      if (sig1===sig2) return 0
      else if (winner===sig1) return -1
      else if (winner===sig2) return 1
    })
  }
  return sigList
}
DAD.electOnce=function(){ // 竞选阶段
  mylog('竞选阶段开始 for block='+(wo.Chain.getTopBlock().height+1))+' using block='+wo.Chain.getTopBlock().height
  mylog('sigPool='+JSON.stringify(my.sigPool))
//    my.currentPhase='phase3'
  if (my.selfSig && my.sigPool.length>0){ // todo: 更好的是核对（签名针对的区块高度，是否当前竞选针对的区块高度）
    DAD.sortSigList(wo.Chain.getTopBlock().hash, my.sigPool) // 对签名池排序
    my.bestSig=DAD.compareSig(wo.Chain.getTopBlock().hash, my.selfSig, my.sigPool[0] || my.selfSig) // 首先比较我自己的签名，和签名池中的最佳签名，用更好的来初始化 bestSig
    wo.Peer.broadcast('/Consensus/shareWinner', {signature:my.bestSig})
  }else{
    mylog('没有收到任何竞争签名，可能没有连接到网络，本轮不参与竞选')
  }
}
DAD.api.shareWinner=function(option){ // 互相转发最优的签名
  if (my.currentPhase==='phase1' && option && option.signature && option.signature!==my.bestSig){
    my.bestSig=DAD.compareSig(wo.Chain.getTopBlock().hash, my.bestSig, option.signature)
    if (my.bestSig===option.signature) { // 新收到的签名获胜了
      wo.Peer.broadcast('/Consensus/shareWinner', {signature:my.bestSig}) // 就进行广播
    }else{ // 对方的签名不如我的，就把我的最优签名告知它
      return {signature:my.bestSig}
    }
  }
}

DAD._init=async function(){
  var signing=Schedule.scheduleJob({ second:0 }, DAD.signOnce) // 每分钟的第0秒
  var mining=Schedule.scheduleJob({second:30}, DAD.mineOnce)
  var electing=Schedule.scheduleJob({second:0}, DAD.electOnce) 
}

/********************** Private in class *********************/

const my={}
my.sigPool=[]
my.newSigPool=[]
my.bestSig
my.selfSig
my.newSig
my.currentPhase