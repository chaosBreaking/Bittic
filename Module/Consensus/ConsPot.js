// 共识模块

const Schedule = require('node-schedule')


/******************** Public of instances ********************/

const DAD = module.exports = function ConsPot(prop) {
  this._class = this.constructor.name
  // this.setProp(prop)
}

const MOM = DAD.prototype

DAD.api = {}

DAD._init = async function () {
  if (await DAD.calibrate()) {
    my.scheduleJobs[0] = Schedule.scheduleJob({ second: 0 }, DAD.signOnce); // 每分钟的第0秒
    my.scheduleJobs[1] = Schedule.scheduleJob({ second: 20 }, DAD.electOnce);
    my.scheduleJobs[2] = Schedule.scheduleJob({ second: 40 }, DAD.mineOnce);
    if (new Date().getSeconds() < 17 && !my.selfPot.signature)
      DAD.signOnce();
  }
  else {
    setTimeout(DAD._init, 60 - new Date().getSeconds());
  }
  return this
}

DAD.calibrate = async function () {
  //启动前本机链情况检查
  let heightNow = Date.time2height();
  if (heightNow === (await wo.Store.getTopBlock()).height + 1 && new Date().getSeconds() < 15) { // 注意，前面的同步可能花了20多秒，到这里已经是在竞选阶段。所以再加个当前秒数的限制。
    return 1;
  }
  // mylog.info(`此刻时间对应的区块高度 : ${heightNow}`);
  // mylog.info('此刻本机链的最高块 : ' + (await wo.Store.getTopBlock()).height);
  if (heightNow === (await wo.Store.getTopBlock()).height + 2 && my.signBlock && (await wo.Store.getTopBlock()).height === my.signBlock.height - 1) {
    // 上一块没有及时出现
    let result = await wo.Peer.randomcast('/Block/getBlock', { Block: { height: (await wo.Store.getTopBlock()).height + 1 } })
    if (result && result.height === (await wo.Store.getTopBlock()).height + 1) {
      let topBlock = new wo['Block'](result)
      await wo.EventBus.call('Chain', '', 'appendBlock', topBlock)
      mylog.info('成功添加区块')
    }
    if (!result) {
      mylog.info('上轮获胜节点错过出块！使用空块')
      my.signBlock = null
      await wo.EventBus.call('Chain', '', 'appendBlock', my.signBlock)
    }
  }
  else if (heightNow > (await wo.Store.getTopBlock()).height + 1) {
    mylog.info('heightNow = ' + heightNow + ' 当前本机链的最高块 = ' + (await wo.Store.getTopBlock()).height + '...准备更新缺少的区块')
    mylog.warn('update Chain');
    await wo.EventBus.call('Chain', '', 'updateChainFromPeer');
  }
  return 0;
}

// 第一阶段：用户签名收集
DAD.signOnce = async function () {
  //  todo: 检查高度是否正确，如果不正确，把my.signBlock添加进去
  my.currentPhase = 'signing';
  heightNow = Date.time2height()
  mylog.info(`此刻时间对应的区块高度 : ${heightNow}`)
  mylog.info('此刻本机链的最高块 : ' + (await wo.Store.getTopBlock()).height)

  if (heightNow === (await wo.Store.getTopBlock()).height + 1 && new Date().getSeconds() < 16) { // 注意，前面的同步可能花了20多秒，到这里已经是在竞选阶段。所以再加个当前秒数的限制。
    my.signerPool = {}
    my.packerPool = {}
    my.selfPot = {} // 注意，不要 my.selfPot=my.bestPot={} 这样指向了同一个对象！
    my.bestPot = {} // 如果设signature=null，就可能会===compareSig返回的null，就产生错误了。因此保留为undefined.
    mylog.info(new Date() + '：签名阶段开始 for block=' + ((await wo.Store.getTopBlock()).height + 1))
    signForOwner();
    return 0;
  }
  await DAD.calibrate();
}
DAD.api.signWatcher = async function (option) { // 监听收集终端用户的签名
  if (my.currentPhase !== 'signing') {
    mylog.info('签名阶段尚未开始，忽略收到的时间证明：' + JSON.stringify(option));
    return null
  }
  if (!(option && option.message && option.signature && option.pubkey && option.netType)) {
    mylog.info('收到无效的时间证明：' + JSON.stringify(option))
    return null
  }

  if (
    !my.signerPool.hasOwnProperty(option.pubkey) // 对一个用户，只采集其一个签名
    && option.netType === wo.Config.netType // 前端应用的链，和后台节点的链相同
    && wo.Crypto.verify(option.message, option.signature, option.pubkey) // 签名有效
    && Date.time2height(option.message.timestamp) === Date.time2height()
    && option.message.blockHash === (await wo.Store.getTopBlock()).hash
    && wo.Crypto.compareSig((await wo.Store.getTopBlock()).hash, my.selfPot.signature, option.signature) !== my.selfPot.signature // 注意，my.selfPot.signature有可能是undefined
  ) {
    var userBalance = await wo.Store.getBalance(wo.Crypto.pubkey2address(option.pubkey))
    if (userBalance && userBalance > wo.Config.SIGNER_THRESHOLD) { // 只有账户里有币的用户才能挖矿。
      my.signerPool[option.pubkey] = { message: option.message, signature: option.signature }
      my.selfPot.signature = option.signature // 随时更新到最佳的签名
      my.selfPot.message = option.message
      my.selfPot.pubkey = option.pubkey
      mylog.info('终端用户（地址：' + wo.Crypto.pubkey2address(option.pubkey) + '）的时间证明验证成功、并且获胜：' + JSON.stringify(option.signature))
    } else {
      mylog.info('终端用户（地址：' + wo.Crypto.pubkey2address(option.pubkey) + '）的余额不足，时间证明不被接收，')
    }
  }
  else {
    mylog.info('终端用户（地址：' + wo.Crypto.pubkey2address(option.pubkey) + '）的签名 ' + option.signature + ' 没有通过本节点验证或竞争')
  }
}
async function signForOwner() {
  // 作为节点，把自己签名直接交给自己。这是因为，全网刚起步时，很可能还没有终端用户，这时需要节点进行签名。
  let myAddress = wo.Crypto.secword2address(wo.Config.ownerSecword)
  let myBalance = await wo.Store.getBalance(myAddress)
  if (myBalance > wo.Config.PACKER_THRESHOLD) {
    let message = { timestamp: new Date(), blockHash: (await wo.Store.getTopBlock()).hash, height: heightNow }
    let signature = wo.Crypto.sign(message, wo.Crypto.secword2keypair(wo.Config.ownerSecword).seckey)
    let pubkey = wo.Crypto.secword2keypair(wo.Config.ownerSecword).pubkey
    my.signerPool[pubkey] = { message: message, signature: signature }
    my.selfPot.signature = signature
    my.selfPot.message = message
    my.selfPot.pubkey = pubkey
    mylog.info('本节点主人（地址' + myAddress + '）的时间证明签名：' + JSON.stringify(signature))
  }
  else {
    mylog.info('本节点主人（地址' + myAddress + '）的账户余额不足，无法参加本轮时间证明签名')
  }
}

// 第二阶段：节点间竞选
DAD.electOnce = async function () {
  my.currentPhase = 'electing';
  if ((await wo.Store.getTopBlock()).height + 1 === Date.time2height()) {
    mylog.info(new Date() + '：竞选阶段开始 for block=' + ((await wo.Store.getTopBlock()).height + 1) + ' using block=' + (await wo.Store.getTopBlock()).height)
    if (my.selfPot.signature) { // todo: 更好的是核对（签名针对的区块高度===当前竞选针对的区块高度） 
      my.bestPot.signature = my.selfPot.signature; // 把本节点收到的用户最佳签名，暂时记为全网最佳。
      my.bestPot.message = my.selfPot.message;
      my.bestPot.pubkey = my.selfPot.pubkey;
      my.signBlock = new wo.Block({ winnerMessage: my.selfPot.message, winnerSignature: my.selfPot.signature, winnerPubkey: my.selfPot.pubkey, type: 'SignBlock' }) // 把候选签名打包进本节点的虚拟块
      my.signBlock.packMe({}, await wo.Store.getTopBlock(), wo.Crypto.secword2keypair(wo.Config.ownerSecword))
      wo.Peer.broadcast('/Consensus/electWatcher', { Block: JSON.stringify(my.signBlock) })
    }
    else {
      mylog.info('本节点没有收集到时间证明，本轮不参与竞选')
    }
  }
  else {
    mylog.info('本节点的最高块高度为' + (await wo.Store.getTopBlock()).height + ', 不匹配当前时刻出块的高度' + Date.time2height() + '，不参与本轮竞选')
    return await DAD.calibrate()
  }
}
DAD.api.electWatcher = async function (option) { // 互相转发最优的签名块
  if (
    option 
    && option.Block
    && option.Block.winnerSignature !== my.bestPot.signature // 不要重复接收同一个最佳块
    && (!my.signBlock || option.Block.hash !== my.signBlock.hash) // 收到的区块不是本节点目前已知的最优块
    && !my.packerPool.hasOwnProperty(option.Block.packerPubkey) // 一个packer只允许出一个签
    && wo.Block.verifySig(option.Block) 
    && wo.Block.verifyHash(option.Block)
    && option.Block.packerPubkey !== wo.Crypto.secword2keypair(wo.Config.ownerSecword).pubkey // 收到的区块不是本节点自己打包的
    && wo.Crypto.verify(option.Block.winnerMessage, option.Block.winnerSignature, option.Block.winnerPubkey)
    && option.Block.lastBlockHash === (await wo.Store.getTopBlock()).hash
  ) {
    my.packerPool[option.Block.packerPubkey] = option.Block
    let userBalance = await wo.Store.getBalance(wo.Crypto.pubkey2address(option.Block.winnerPubkey));
    let packerBalance = await wo.Store.getBalance(wo.Crypto.pubkey2address(option.Block.packerPubkey));
    if (option.Block.winnerSignature === wo.Crypto.compareSig((await wo.Store.getTopBlock()).hash, my.bestPot.signature, option.Block.winnerSignature) // 新收到的签名获胜了。注意，my.bestPot.signature有可能是undefined
      && userBalance >= wo.Config.SIGNER_THRESHOLD
      && packerBalance >= wo.Config.PACKER_THRESHOLD
    ) {
      mylog.info('新收到的预签名空块胜出：赢家签名=' + option.Block.winnerSignature + '，地址=' + wo.Crypto.pubkey2address(option.Block.winnerPubkey) + '，节点地址=' + wo.Crypto.pubkey2address(option.Block.packerPubkey))
      my.bestPot.signature = option.Block.winnerSignature
      my.bestPot.pubkey = option.Block.winnerPubkey
      my.bestPot.message = option.Block.winnerMessage
      my.signBlock = option.Block // 保存新收到的签名块
      wo.Peer.broadcast('/Consensus/electWatcher', { Block: JSON.stringify(option.Block) }) // 就进行广播
    }
    else if(userBalance < wo.Config.SIGNER_THRESHOLD
      || packerBalance < wo.Config.PACKER_THRESHOLD ) {
        mylog.info('收到的预签名空块的用户' + wo.Crypto.pubkey2address(option.Block.winnerPubkey) + '或节点' + wo.Crypto.pubkey2address(option.Block.packerPubkey) + '的余额不足' + option.Block.winnerSignature)
    }
    else { // 对方的签名不如我的，就把我的最优签名告知它
      mylog.info('收到的预签名空块的用户' + wo.Crypto.pubkey2address(option.Block.winnerPubkey) + '或节点' + wo.Crypto.pubkey2address(option.Block.packerPubkey) + '的签名没有胜出：' + option.Block.winnerSignature)
    }
    return my.signBlock
  }
  else if (!wo.Block.verifySig(option.Block) || !wo.Block.verifyHash(option.Block)) {
    mylog.info("收到无法通过签名或哈希验证的预签名空块：")
    mylog.info("来自用户：" + wo.Crypto.pubkey2address(option.Block.winnerPubkey))
    mylog.info("来自节点：" + wo.Crypto.pubkey2address(option.Block.packerPubkey))
    mylog.info("收到的预签名空块的上一区块哈希: " + option.Block.lastBlockHash)
    mylog.info("本节点上一区块HASH: " + (await wo.Store.getTopBlock()).hash)
  }
  else // 通常，假如本节点具有全网赢家，我发给别人后，别人会再发给我，就会走到这里来。
  {
    mylog.info('收到的签名块无效：' + JSON.stringify(option.Block.hash))
    if (option.Block.packerPubkey === wo.Crypto.secword2keypair(wo.Config.ownerSecword).pubkey)
      mylog.info('是本节点打包的')
    if (my.packerPool.hasOwnProperty(option.Block.packerPubkey))
      mylog.info('该节点已经提交过区块')
    if (option.Block.winnerSignature === my.bestPot.signature)
      mylog.info('重复接收该签名')
    if (my.signBlock && option.Block.hash === my.signBlock.hash)
      mylog.info('已是本节点已知的最佳块')
  }
  return null
}
DAD.api.shareWinner = async function () {
  return my.signBlock
}

// 第三阶段：获胜者出块，或接收获胜者打包广播的区块
DAD.mineOnce = async function () {
  my.currentPhase = 'mining';
  if (Date.time2height() === (await wo.Store.getTopBlock()).height + 1) {
    mylog.info(new Date() + '：出块阶段开始 for block=' + ((await wo.Store.getTopBlock()).height + 1) + ' using block=' + (await wo.Store.getTopBlock()).height)
    mylog.info('本节点的候选签名=' + my.selfPot.signature + '，来自地址地址 ' + wo.Crypto.pubkey2address(my.selfPot.pubkey))
    mylog.info('全网最终获胜签名=' + my.bestPot.signature + '，来自地址地址 ' + wo.Crypto.pubkey2address(my.bestPot.pubkey))
    if (my.selfPot.signature && my.bestPot.signature === my.selfPot.signature) { // 全网最终获胜者是我自己，于是打包并广播。注意防止 bestPot===selfPot===undefined，这是跳过竞选阶段直接从前两阶段开始会发生的。
      mylog.info('本节点获胜，开始出块...')
      let res = await wo.EventBus.call('Chain', '', 'createBlock', { winnerMessage: my.selfPot.message, winnerSignature: my.selfPot.signature, winnerPubkey: my.selfPot.pubkey })
      mylog.info('本节点出块哈希为： ', res.hash)
      wo.Peer.broadcast('/Consensus/mineWatcher', { Block: res });
      return 0;
    }
    mylog.info('本节点没有赢')
  }
  return 0
}
DAD.api.mineWatcher = async function (option) { // 监听别人发来的区块
  if (option
    && option.Block
    && option.Block.winnerSignature === my.bestPot.signature
    && my.bestPot.signature !== my.selfPot.signature // 收到了全网赢家的区块，而全网赢家不是本节点的
    && option.Block.height === (await wo.Store.getTopBlock()).height + 1
    && option.Block.lastBlockHash === (await wo.Store.getTopBlock()).hash
  ) {
    // 注意不要接受我自己作为获胜者创建的块，以及不要重复接受已同步的区块
    wo.EventBus.call('Chain', '', 'appendBlock', option.Block)
    wo.Peer.broadcast('/Consensus/mineWatcher', { Block: option.Block })
    mylog.info('本节点收到全网赢家的区块哈希为：' + option.Block.hash + '，全网赢家的地址为' + wo.Crypto.pubkey2address(option.Block.winnerPubkey) + '，打包节点的地址为 ' + wo.Crypto.pubkey2address(option.Block.packerPubkey))
  }
  return 0
}

//分叉处理
DAD.forkHandler = async function (option) {
  if ((await wo.Store.getTopBlock()).height <= Date.time2height() - 2)
    return "高度未达到分叉标准"
  let res = await wo.Peer.broadcast('/Consensus/getRBS', { target: option.Block.packerPubkey })//取第一个元素
  if (!res) {
    mylog.warn("没拿到对方缓存表")
    return null
  }
  // res = res[0]
  let diff = DAD.diffRecBlockStack(my.recBlockStack, res)
  if (typeof diff.index === 'undefined' || diff.index === 0) {
    mylog.warn('分叉长度超过可处理范围')
    return null
  }
  if (res[diff.index].height === my.recBlockStack[diff.index].type && res[diff.index].height === "VirtBlock" && my.recBlockStack[diff.index].type !== "VirtBlock") {
    mylog.warn("对方的虚拟块应当被合并")
    return null
  }
  //区块合法性检验
  let forkBlock = new wo.Block(my.recBlockStack[diff.index])
  if (!wo.Crypto.verify(forkBlock.winnerMessage, forkBlock.winnerSignature, forkBlock.winnerPubkey)
    || !forkBlock.verifySig()
    || !forkBlock.verifyHash()
  ) {
    mylog.warn("收到非合法的区块,分叉合并取消")
    return null
  }
  //检验通过
  else if (res[index].totalAmount < my.recBlockStack[index].totalAmount || res[index].totalFee < my.recBlockStack[index].totalFee) {
    mylog.warn("本节点区块交易量或手续费更多，保持本机区块数据，取消合并")
    return null
  }
  //剩下的情况本机需要被合并   
  else {
    //说明自己分叉，开始处理分叉
    mylog.warn(`本节点在高度${diff.height}分叉,开始处理分叉...`)
    my.scheduleJobs[0].cancel()
    my.scheduleJobs[1].cancel()
    my.scheduleJobs[2].cancel()
    let blockList = await wo.Block.getAll({ Block: { height: '>' + (diff.height - 1) }, config: { limit: 10, order: 'height ASC' } })
    for (let block of blockList) {
      if (block.actionHashList.length !== 0) {
        //获取本块所有交易
        let actionList = await wo.Action.getAll({ Action: { blockHash: block.hash }, config: { limit: block.actionHashList.length } })
        for (let action of actionList) {
          wo.Peer.broadcast('/Action/prepare', option) // 将自己区块内的交易广播出去
        }
      }
      await block.dropMe()
    }
    my.recBlockStack.splice(diff.index) //删除recBlockStack里从分叉点开始以后的全部块记录
    wo.Chain.pushTopBlock(my.recBlockStack[diff.index - 1]) //记录top区块
    await wo.Chain.updateChainFromPeer()
    await wo.Chain.verifyChainFromDb()
    my.bestPot = {} // 全网最佳时间证明：{签名，时间申明，公钥}
    my.selfPot = {} // 本节点最佳时间证明：{签名，时间申明，公钥}
    my.signBlock = {}
    my.scheduleJobs[0].reschedule({ second: 0 }, DAD.signOnce)
    my.scheduleJobs[1].reschedule({ second: 20 }, DAD.electOnce)
    my.scheduleJobs[2].reschedule({ second: 40 }, DAD.mineOnce)
    return 0
  }

}
DAD.diffRecBlockStack = function (mine, target) {
  //target的类型也是列表
  for (index in target) {
    if (target[index].hash !== mine[index].hash
      && target[index].height === mine[index].height
      && target[index].lastBlockHash === mine[index].lastBlockHash
      || target[index].winnerSignature !== mine[index].winnerSignature) {
      mylog.warn(`差异高度${target[index].height}`)
      return { index, height: target[index].height }
    }
  }
  return null
}
DAD.pushInRBS = function (obj) {
  // MaxRBS = 10
  if (my.recBlockStack.length < wo.Config.MaxRBS) {
    my.recBlockStack.push(obj)
  }
  else {
    my.recBlockStack.splice(0, 1)
    my.recBlockStack.push(obj)
  }
}
DAD.api.getRBS = async function (target) {
  // if(target.packerPubkey===wo.Config.packerPubkey){
  //   mylog.info("收到分享缓存区块请求")
  //   return my.recBlockStack
  // }
  return await wo.Store.getRBS()
}

DAD.stopScheduleJob = function () {
  mylog.error('stop')
  my.scheduleJobs[0].cancel()
  my.scheduleJobs[1].cancel()
  my.scheduleJobs[2].cancel()
}

DAD.api.test = async function (target) {
  return 'success'
}
/********************** Private in class *********************/

const my = {}
my.signerPool = {} // use enduser pubkey as key, {signature, message} as value
my.packerPool = {} // use fullnode pubkey as key, signBlock as value
my.bestPot = {} // 全网最佳时间证明：{签名，时间申明，公钥}
my.selfPot = {} // 本节点最佳时间证明：{签名，时间申明，公钥}
my.signBlock = {} // 抽签块
my.recBlockStack = []   //缓存最近的5个区块
my.scheduleJobs = []

my._currentPhase;
Object.defineProperty(my, "currentPhase", {
  get() {
    return my._currentPhase;
  },
  set(phase) {
    my._currentPhase = phase;
    wo.Store.setCurrentPhase(phase);
  }
})


/**
 * 100:共识校对完毕，启动定时器任务
 * 110:签名阶段开始
 * 120:竞选阶段开始
 * 130:出块阶段开始
 * 500:启动分叉处理
 * 
 */