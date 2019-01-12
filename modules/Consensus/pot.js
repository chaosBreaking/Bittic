// 共识模块
/**
 * 1.取得最后一个区块
 * 2.调度出块
 * 3.分叉处理
 * 4.在另一个进程收到API调用的处理程序
 */
const Schedule = require('node-schedule')
const electTime = (wo.Config.BLOCK_PERIOD / 3).toFixed(0) * 1
const mineTime = (wo.Config.BLOCK_PERIOD / 3).toFixed(0) * 2
require('../util/Date.js')
/** ****************** Public of instances ********************/

const POT = {}
async function calibrate () {
  /**
  * topHeight === heightNow - 1
  *   time -> [0, electTime) ---> signOnce
  *   time -> [electTime, electTime + period) ---> 自己不签名，也不收集签名，等待别人的块
  *   time -> [mineTime, mineTime + period) ---> 广播请求最新区块，成功则加入，失败则创建虚拟块
  */
  let missLastBlock = my.signBlock &&
    Date.time2height() === my.signBlock.height &&
    (await wo.Chain.getTopBlock()).height === my.signBlock.height - 1
  if (missLastBlock) {
    // 上一块没有及时出现
    mylog.warn('上一块没有正常出现，开始广播进行同步......')
    let result = await wo.Peer.call('/Block/getBlock', { Block: { height: (await wo.Chain.getTopBlock()).height + 1 } })
    if (result && result.height === (await wo.Chain.getTopBlock()).height + 1) {
      let topBlock = new wo.Block(result)
      await wo.Chain.appendBlock(topBlock)
      mylog.info('成功添加区块')
    } else {
      mylog.info('无法获取上轮获胜节点的区块！使用空块......')
      my.signBlock = null
      await wo.Chain.appendBlock(my.signBlock)
    }
    return 0
  }
  let needUpdate = Date.time2height() > (await wo.Chain.getTopBlock()).height + 1
  if (needUpdate) {
    mylog.info(`此时刻应该到达的高度：[${Date.time2height()}]  当前本机链的最高块高度：[${(await wo.Chain.getTopBlock()).height}]`)
    mylog.info('>===== 开始进行区块更新和同步 =====>')
    await wo.Chain.updateChainFromPeer()
    let topBlock = await wo.Chain.getTopBlock()
    mylog.info(`>===== 当前更新到高度：${topBlock.height} =====>`)
    if (topBlock.height === Date.time2height() && getTimeSlot() === 'mineTime') {
      // 成功更新到最新区块但是已经到了出块期，停止后续操作
      mylog.info('已经更新到最新区块，当前时间已错过本轮出块，准备参与下一轮次出块竞选...')
    } else if (Date.time2height() === topBlock.height + 1) {
      // 只差最新的一个区块
      if (getTimeSlot() === 'mineTime') {
        // 如果在出块时间，则向其他节点广播和同步最新区块
        let latestBlock = await wo.Peer.call('/Block/getBlock', { Block: { height: topBlock.height + 1 } })
        let block = new wo.Block(latestBlock)
        if (block.lastBlockHash === topBlock.hash && block.verifySig() && block.verifyHash()) {
          mylog.info('取得最新区块，准备参加下一轮出块竞选...')
        } else {
          mylog.info('无法更新到最新一块，创建虚拟块')
          await createVirtBlock()
        }
      } else {
        // 如果不是在签名期的话，就可以等待mineOnce了,停止后续操作
        mylog.info('已经更新所有已出区块，等待本轮最新区块出块...')
      }
    } else {
      // 缺少较多区块而且无法从外界同步，则创建虚拟块
      mylog.info('无法从外界同步到区块，创建虚拟块...')
      for (let height = topBlock.height + 1; height < Date.time2height(); height++) {
        await createVirtBlock()
      }
      if (getTimeSlot() !== 'signTime') {
        // 不是在签名期间的话，就直接创建到最新的高度
        mylog.info('本轮错过出块，创建最新的虚拟块...')
        await createVirtBlock()
        setTimeout(POT.signOnce, 60 - new Date().getSeconds())
      } else {
        // 处于签名期，则正常开始一个出块周期
        if (!my.selfPot.signature) {
          mylog.info('处于签名期，正常开始一个出块周期,执行签名')
          await POT.signOnce()
        }
      }
    }
  }
  return 0
}
function getTimeSlot () {
  let thisSec = new Date().getSeconds()
  if ((thisSec >= 0 && thisSec < electTime) || thisSec < (electTime + wo.Config.BLOCK_PERIOD % wo.Config.BLOCK_PERIOD)) {
    return 'signTime'
  } else if ((thisSec >= electTime || thisSec >= (electTime + wo.Config.BLOCK_PERIOD % wo.Config.BLOCK_PERIOD)) && (thisSec < mineTime || thisSec < (mineTime + wo.Config.BLOCK_PERIOD % wo.Config.BLOCK_PERIOD))) {
    return 'electTime'
  } else if (thisSec >= mineTime || thisSec >= (mineTime + wo.Config.BLOCK_PERIOD % wo.Config.BLOCK_PERIOD)) {
    return 'mineTime'
  }
}
async function createVirtBlock () {
  let topBlock = await wo.Chain.getTopBlock()
  let block = new wo.Block({ type: 'VirtBlock', timestamp: new Date(), height: topBlock.height + 1, hash: topBlock.hash, lastBlockHash: topBlock.hash })
  await wo.Chain.appendBlock(block)
  mylog.info('虚拟块创建成功 --> 高度' + block.height)
  return block
}
POT._init = async function () {
  /**
  * topHeight === heightNow - 1
  *   time -> [0, electTime) ---> signOnce
  *   time -> [electTime, electTime + period) ---> 自己不签名，也不收集签名，等待别人的块
  *   time -> [mineTime, mineTime + period) ---> 广播请求最新区块，成功则加入，失败则创建虚拟块
  */
  let canStartNow = (Date.time2height() === (await wo.Chain.getTopBlock()).height + 1) && getTimeSlot() === 'signTime'
  if (canStartNow) {
    if (!my.selfPot.signature) {
      await POT.signOnce()
    }
  } else {
    mylog.info(`此时刻应该到达的高度：[${Date.time2height()}]  当前本机链的最高块高度：[${(await wo.Chain.getTopBlock()).height}]`)
    mylog.info('>===== 开始进行区块更新和同步 =====>')
    await wo.Chain.updateChainFromPeer()
    let topBlock = await wo.Chain.getTopBlock()
    mylog.info(`>===== 当前更新到高度：${topBlock.height} =====>`)
    if (topBlock.height === Date.time2height() && getTimeSlot() === 'mineTime') {
      // 成功更新到最新区块但是已经到了出块期，停止后续操作
      mylog.info('已经更新到最新区块，当前时间已错过本轮出块，准备参与下一轮次出块竞选...')
    } else if (Date.time2height() === topBlock.height + 1) {
      // 只差最新的一个区块
      if (getTimeSlot() === 'mineTime') {
        // 如果在出块时间，则向其他节点广播和同步最新区块
        let latestBlock = await wo.Peer.call('/Block/getBlock', { Block: { height: topBlock.height + 1 } })
        let block = new wo.Block(latestBlock)
        if (block.lastBlockHash === topBlock.hash && block.verifySig() && block.verifyHash()) {
          mylog.info('取得最新区块，准备参加下一轮出块竞选...')
        } else {
          mylog.info('无法更新到最新一块，创建虚拟块')
          await createVirtBlock()
        }
      } else {
        // 如果不是在签名期的话，就可以等待mineOnce了,停止后续操作
        mylog.info('已经更新所有已出区块，等待本轮最新区块出块...')
      }
    } else {
      // 缺少较多区块而且无法从外界同步，则创建虚拟块
      mylog.info('无法从外界同步到区块，创建虚拟块...')
      for (let height = topBlock.height + 1; height < Date.time2height(); height++) {
        await createVirtBlock()
      }
      if (getTimeSlot() !== 'signTime') {
        // 不是在签名期间的话，就直接创建到最新的高度
        mylog.info('本轮错过出块，创建最新的虚拟块...')
        await createVirtBlock()
        setTimeout(POT.signOnce, 60 - new Date().getSeconds())
      } else {
        // 处于签名期，则正常开始一个出块周期
        if (!my.selfPot.signature) {
          mylog.info('处于签名期，正常开始一个出块周期,执行签名')
          await POT.signOnce()
        }
      }
    }
  }
  mylog.info('设置定时任务...')
  my.scheduleJobs[0] = Schedule.scheduleJob({ second: [0, wo.Config.BLOCK_PERIOD] }, POT.signOnce) // 每分钟的第0秒
  my.scheduleJobs[1] = Schedule.scheduleJob({ second: [electTime, wo.Config.BLOCK_PERIOD + electTime] }, POT.electOnce)
  my.scheduleJobs[2] = Schedule.scheduleJob({ second: [mineTime, wo.Config.BLOCK_PERIOD + mineTime] }, POT.mineOnce)
  return this
}

POT.api = {}
// 第一阶段：用户签名收集
POT.signOnce = async function () {
  my.currentPhase = 'signing'
  mylog.info('<====== 签名阶段 ======>')
  let heightNow = Date.time2height()
  mylog.info('Aim to ', heightNow, 'mytop ', (await wo.Chain.getTopBlock()).height)
  if (my.selfPot.signature) my.selfPot = {}
  if ((await wo.Chain.getTopBlock()).height < heightNow - 1) {
    mylog.warn('本机状态异常,无法签名')
    await calibrate()
    return 0
  }
  let canSignForMyself = Date.time2height() === (await wo.Chain.getTopBlock()).height + 1 && getTimeSlot() === 'signTime' && !my.selfPot.signature
  if (canSignForMyself) { // 注意，前面的同步可能花了20多秒，到这里已经是在竞选阶段。所以再加个当前秒数的限制。
    my.signerPool = {}
    my.packerPool = {}
    my.selfPot = {} // 注意，不要 my.selfPot=my.bestPot={} 这样指向了同一个对象！
    my.bestPot = {} // 如果设signature=null，就可能会===compareSig返回的null，就产生错误了。因此保留为undefined.
    mylog.info(new Date() + '：签名阶段开始 for block=' + Date.time2height(), 'using block', ((await wo.Chain.getTopBlock()).height))
    signForOwner()
    return 0
  }
  return 0
}
POT.api.signWatcher = async function (option) { // 监听收集终端用户的签名
  if (my.currentPhase !== 'signing') {
    mylog.info('签名阶段尚未开始，忽略收到的时间证明：' + JSON.stringify(option))
    return null
  }
  if (!(option && option.message && option.signature && option.pubkey && option.netType)) {
    mylog.info('收到无效的时间证明：' + JSON.stringify(option))
    return null
  }

  if (
    !my.signerPool.hasOwnProperty(option.pubkey) && // 对一个用户，只采集其一个签名
    option.netType === wo.Config.netType && // 前端应用的链，和后台节点的链相同
    wo.Crypto.verify(option.message, option.signature, option.pubkey) && // 签名有效
    Date.time2height(option.message.timestamp) === Date.time2height() &&
    option.message.blockHash === (await wo.Chain.getTopBlock()).hash &&
    wo.Crypto.compareSig((await wo.Chain.getTopBlock()).hash, my.selfPot.signature, option.signature) !== my.selfPot.signature // 注意，my.selfPot.signature有可能是undefined
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
  } else {
    mylog.info('终端用户（地址：' + wo.Crypto.pubkey2address(option.pubkey) + '）的签名 ' + option.signature + ' 没有通过本节点验证或竞争')
  }
  return 0
}
async function signForOwner () {
  // 作为节点，把自己签名直接交给自己。这是因为，全网刚起步时，很可能还没有终端用户，这时需要节点进行签名。
  let myAddress = wo.Crypto.secword2address(wo.Config.ownerSecword)
  let myBalance = await wo.Store.getBalance(myAddress)
  let heightNow = Date.time2height()
  if (myBalance > wo.Config.PACKER_THRESHOLD) {
    let message = { timestamp: new Date(), blockHash: (await wo.Chain.getTopBlock()).hash, height: heightNow }
    let signature = wo.Crypto.sign(message, wo.Crypto.secword2keypair(wo.Config.ownerSecword).seckey)
    let pubkey = wo.Crypto.secword2keypair(wo.Config.ownerSecword).pubkey
    my.signerPool[pubkey] = { message: message, signature: signature }
    my.selfPot.signature = signature
    my.selfPot.message = message
    my.selfPot.pubkey = pubkey
    mylog.info('本节点主人（地址' + myAddress + '）的时间证明签名：' + JSON.stringify(signature))
  } else {
    mylog.info('本节点主人（地址' + myAddress + '）的账户余额不足，无法参加本轮时间证明签名')
  }
  return 0
}

// 第二阶段：节点间竞选
POT.electOnce = async function () {
  my.currentPhase = 'electing'
  mylog.info('<====== 竞选阶段 ======>')
  let canElect = (await wo.Chain.getTopBlock()).height + 1 === Date.time2height()
  mylog.info(`可否竞选：${canElect}, mytop: [${(await wo.Chain.getTopBlock()).height}]  aim: ${Date.time2height()}`)
  if (canElect) {
    mylog.info(new Date() + '：竞选阶段开始 for block=' + ((await wo.Chain.getTopBlock()).height + 1) + ' using block=' + (await wo.Chain.getTopBlock()).height)
    if (my.selfPot.signature) { // todo: 更好的是核对（签名针对的区块高度===当前竞选针对的区块高度）
      my.bestPot.signature = my.selfPot.signature // 把本节点收到的用户最佳签名，暂时记为全网最佳。
      my.bestPot.message = my.selfPot.message
      my.bestPot.pubkey = my.selfPot.pubkey
      my.signBlock = new wo.Block({ winnerMessage: my.selfPot.message, winnerSignature: my.selfPot.signature, winnerPubkey: my.selfPot.pubkey, type: 'SignBlock' }) // 把候选签名打包进本节点的虚拟块
      my.signBlock.packMe({}, await wo.Chain.getTopBlock(), wo.Crypto.secword2keypair(wo.Config.ownerSecword))
      await wo.Peer.emitPeers('electWatcher', { Block: JSON.stringify(my.signBlock) })
    } else {
      mylog.info('本节点没有收集到时间证明，本轮不参与竞选')
    }
  }
  return 0
}
POT.api.electWatcher = async function (option) { // 互相转发最优的签名块
  if (!option || !option.Block) return null
  if (
    option.Block.winnerSignature !== my.bestPot.signature && // 不要重复接收同一个最佳块
    (!my.signBlock || option.Block.hash !== my.signBlock.hash) && // 收到的区块不是本节点目前已知的最优块
    !my.packerPool.hasOwnProperty(option.Block.packerPubkey) && // 一个packer只允许出一个签
    wo.Block.verifySig(option.Block) &&
    wo.Block.verifyHash(option.Block) &&
    option.Block.packerPubkey !== wo.Crypto.secword2keypair(wo.Config.ownerSecword).pubkey && // 收到的区块不是本节点自己打包的
    wo.Crypto.verify(option.Block.winnerMessage, option.Block.winnerSignature, option.Block.winnerPubkey) &&
    option.Block.lastBlockHash === (await wo.Chain.getTopBlock()).hash
  ) {
    my.packerPool[option.Block.packerPubkey] = option.Block
    let userBalance = await wo.Store.getBalance(wo.Crypto.pubkey2address(option.Block.winnerPubkey))
    let packerBalance = await wo.Store.getBalance(wo.Crypto.pubkey2address(option.Block.packerPubkey))
    if (option.Block.winnerSignature === wo.Crypto.compareSig((await wo.Chain.getTopBlock()).hash, my.bestPot.signature, option.Block.winnerSignature) && // 新收到的签名获胜了。注意，my.bestPot.signature有可能是undefined
      userBalance >= wo.Config.SIGNER_THRESHOLD &&
      packerBalance >= wo.Config.PACKER_THRESHOLD
    ) {
      mylog.info('新收到的预签名空块胜出：赢家签名=' + option.Block.winnerSignature + '，地址=' + wo.Crypto.pubkey2address(option.Block.winnerPubkey) + '，节点地址=' + wo.Crypto.pubkey2address(option.Block.packerPubkey))
      my.bestPot.signature = option.Block.winnerSignature
      my.bestPot.pubkey = option.Block.winnerPubkey
      my.bestPot.message = option.Block.winnerMessage
      my.signBlock = option.Block // 保存新收到的签名块
      wo.Peer.emitPeers('electWatcher', { Block: JSON.stringify(option.Block) }) // 就进行广播
    } else if (userBalance < wo.Config.SIGNER_THRESHOLD ||
      packerBalance < wo.Config.PACKER_THRESHOLD) {
      mylog.info('收到的预签名空块的用户' + wo.Crypto.pubkey2address(option.Block.winnerPubkey) + '或节点' + wo.Crypto.pubkey2address(option.Block.packerPubkey) + '的余额不足' + option.Block.winnerSignature)
    } else { // 对方的签名不如我的，就把我的最优签名告知它
      mylog.info('收到的预签名空块的用户' + wo.Crypto.pubkey2address(option.Block.winnerPubkey) + '或节点' + wo.Crypto.pubkey2address(option.Block.packerPubkey) + '的签名没有胜出：' + option.Block.winnerSignature)
    }
    return my.signBlock
  } else if (!wo.Block.verifySig(option.Block) || !wo.Block.verifyHash(option.Block)) {
    mylog.info('收到无法通过签名或哈希验证的预签名空块：')
    mylog.info('来自用户：' + wo.Crypto.pubkey2address(option.Block.winnerPubkey))
    mylog.info('来自节点：' + wo.Crypto.pubkey2address(option.Block.packerPubkey))
    mylog.info('收到的预签名空块的上一区块哈希: ' + option.Block.lastBlockHash)
    mylog.info('本节点上一区块HASH: ' + (await wo.Chain.getTopBlock()).hash)
  } else {
    // 通常，假如本节点具有全网赢家，我发给别人后，别人会再发给我，就会走到这里来。
    mylog.info('收到的签名块无效：' + JSON.stringify(option.Block.hash))
    if (option.Block.packerPubkey === wo.Crypto.secword2keypair(wo.Config.ownerSecword).pubkey) { mylog.info('是本节点打包的') }
    if (my.packerPool.hasOwnProperty(option.Block.packerPubkey)) { mylog.info('该节点已经提交过区块') }
    if (option.Block.winnerSignature === my.bestPot.signature) { mylog.info('重复接收该签名') }
    if (my.signBlock && option.Block.hash === my.signBlock.hash) { mylog.info('已是本节点已知的最佳块') }
  }
  return null
}
POT.api.shareWinner = async function () {
  return my.signBlock
}

// 第三阶段：获胜者出块，或接收获胜者打包广播的区块
POT.mineOnce = async function () {
  my.currentPhase = 'mining'
  mylog.info('<====== 出块阶段 ======>')
  let canMine = Date.time2height() === (await wo.Chain.getTopBlock()).height + 1
  mylog.info(`可否出块: ${canMine}`)
  if (canMine) {
    mylog.info(new Date() + '：出块阶段开始 for block=' + ((await wo.Chain.getTopBlock()).height + 1) + ' using block=' + (await wo.Chain.getTopBlock()).height)
    mylog.info('本节点的候选签名=' + my.selfPot.signature + '，来自地址地址 ' + wo.Crypto.pubkey2address(my.selfPot.pubkey))
    mylog.info('全网最终获胜签名=' + my.bestPot.signature + '，来自地址地址 ' + wo.Crypto.pubkey2address(my.bestPot.pubkey))
    if (my.selfPot.signature && my.bestPot.signature === my.selfPot.signature) { // 全网最终获胜者是我自己，于是打包并广播。注意防止 bestPot===selfPot===undefined，这是跳过竞选阶段直接从前两阶段开始会发生的。
      mylog.info('本节点获胜，开始出块...')
      let newBlock = await wo.Chain.createBlock({
        winnerMessage: my.selfPot.message,
        winnerSignature: my.selfPot.signature,
        winnerPubkey: my.selfPot.pubkey
      })
      mylog.info('本节点出块哈希为： ', newBlock.hash)
      wo.Peer.emitPeers('mineWatcher', { Block: newBlock })
      return 0
    }
    mylog.info('本节点没有赢')
  }
  return 0
}
POT.api.mineWatcher = async function (option) { // 监听别人发来的区块
  if (option &&
    option.Block &&
    option.Block.winnerSignature === my.bestPot.signature &&
    my.bestPot.signature !== my.selfPot.signature && // 收到了全网赢家的区块，而全网赢家不是本节点的
    option.Block.height === (await wo.Chain.getTopBlock()).height + 1 &&
    option.Block.lastBlockHash === (await wo.Chain.getTopBlock()).hash
  ) {
    // 注意不要接受我自己作为获胜者创建的块，以及不要重复接受已同步的区块
    wo.Chain.appendBlock(option.Block)
    wo.Peer.emitPeers('mineWatcher', { Block: option.Block })
    mylog.info('本节点收到全网赢家的区块哈希为：' + option.Block.hash + '，全网赢家的地址为' + wo.Crypto.pubkey2address(option.Block.winnerPubkey) + '，打包节点的地址为 ' + wo.Crypto.pubkey2address(option.Block.packerPubkey))
  }
  return 0
}

POT.stopScheduleJob = function () {
  mylog.error('stop')
  my.scheduleJobs[0].cancel()
  my.scheduleJobs[1].cancel()
  my.scheduleJobs[2].cancel()
}

POT.api.test = async function (target) {
  return 'success'
}
wo.Peer.on('electWatcher', POT.api.electWatcher)
wo.Peer.on('mineWatcher', POT.api.mineWatcher)
/** ******************** Private in class *********************/

const my = {}
my.signerPool = {} // use enduser pubkey as key, {signature, message} as value
my.packerPool = {} // use fullnode pubkey as key, signBlock as value
my.bestPot = {} // 全网最佳时间证明：{签名，时间申明，公钥}
my.selfPot = {} // 本节点最佳时间证明：{签名，时间申明，公钥}
my.signBlock = {} // 抽签块
my.recBlockStack = [] // 缓存最近的5个区块
my.scheduleJobs = []
Object.defineProperty(my, 'currentPhase', {
  get () {
    return my._currentPhase
  },
  set (phase) {
    my._currentPhase = phase
    wo.Store.setCurrentPhase(phase)
  }
})

module.exports = POT
