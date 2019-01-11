'use strict'
/**
 * Chain要实现的功能
 * 1.创建区块
 * 2.添加区块
 * 3.缓存上一区块
 * 4.验证数据库内的区块
 * 5.同步区块
 * 6.奖励成功出块的人
 */

const Chain = module.exports = function Chain () {
  this._class = this.constructor.name
}

Chain.api = {} // 面向前端应用的API

Chain._init = async function () {
  await Chain.createGenesis()
  mylog.info('<===== 创世区块创建完毕 =====>')
  await Chain.verifyChainFromDb()
  mylog.info('<===== 数据库区块验证完毕 =====>')
  await Chain.updateChainFromPeer()
  mylog.info('<===== 区块同步完毕 =====>')
  return this
}

Chain.createGenesis = async function () {
  mylog.info(`======== Net ${wo.Config.netType} ========`)
  mylog.info(`GENESIS_EPOCH: ${wo.Config.GENESIS_EPOCH.toJSON()}`)
  my.genesis = new wo.Block(wo.Config.GENESIS_BLOCK[wo.Config.netType])
  my.genesis.packMe({}, null, wo.Crypto.secword2keypair(wo.Config.GENESIS_ACCOUNT.secword))
  await Chain.pushTopBlock(my.genesis)
  await wo.Store.increase(wo.Config.INITIAL_ACCOUNT.address, wo.Config.COIN_INIT_AMOUNT)
  // 在开发链上，自动给当前用户预存一笔，使其能够挖矿
  // 给两个账户加钱，防止两机测试时互不相认
  if (wo.Config.netType === 'devnet') {
    for (let acc of wo.Config.DEV_ACCOUNT) {
      await wo.Store.increase(wo.Crypto.secword2address(acc.secword), 100000)
      mylog.info(`devnet adds 100000 coin to "${wo.Crypto.secword2address(acc.secword)} of "${acc.secword}"`)
    }
  }
  mylog.info('Genesis is created and verified: ' + my.genesis.verifySig())
  return my.genesis
}

Chain.verifyChainFromDb = async function () {
  mylog.info('开始验证数据库中的区块')
  await wo.Block.dropAll({ Block: { height: '<=' + wo.Config.GENESIS_HEIGHT } }) // 极端罕见的可能，有错误的（为了测试，手工加入的）height<创世块的区块，也删掉它。
  let blockList = await wo.Block.getAll({ Block: { height: '>' + my.topBlock.height }, config: { limit: 100, order: 'height ASC' } })
  let errorFlag = false
  while (Array.isArray(blockList) && blockList.length > 0) {
    mylog.info('取出' + blockList.length + '个区块')
    for (let block of blockList) {
      if (block.height === my.topBlock.height + 1 && block.lastBlockHash === my.topBlock.hash && block.verifySig() && block.verifyHash()) {
        if (await block.verifyActionList()) {
          mylog.info('成功验证区块：' + block.height)
          Chain.pushTopBlock(block)
        } else {
          mylog.error('非法区块' + block.height, '：包含无法获取或验证的交易')
          errorFlag = true
          break
        }
      } else {
        // 取出的区块在验证过程中出错则直接退出循环，从外部同步
        mylog.warn('block ' + block.height + ' 验证失败！从数据库中删除...')
        errorFlag = true
        break
      }
    }
    if (!errorFlag) {
      blockList = await wo.Block.getAll({ Block: { height: '>' + my.topBlock.height }, config: { limit: 100, order: 'height ASC' } })
      if (!blockList || blockList.length === 0) { break }
    } else { break }
  }
  await wo.Block.dropAll({ Block: { height: '>' + my.topBlock.height } })
  mylog.info('...数据库中的区块验证完毕')
  if (my.topBlock.height === wo.Config.GENESIS_HEIGHT) {
    mylog.info('数据库中没有区块，清空所有事务')
    await wo.Action.dropAll({ Action: { height: '>0' } })
  }
  return my.topBlock
}

Chain.updateChainFromPeer = async function () { // 向其他节点获取自己缺少的区块；如果取不到最高区块，就创建虚拟块填充。
  if (my.addingLock) return 0
  my.addingLock = 1
  mylog.info('开始向邻居节点同步区块')
  for (let count = 0; count < 3; count++) { // 确保更新到截至当前时刻的最高区块。
    mylog.info(`向全网广播同步请求-->开始第${count}轮同步`)
    let blockList = await wo.Peer.call('/Block/getBlockList', { Block: { height: '>' + my.topBlock.height }, config: { limit: 100, order: 'height ASC' } })
    if (Array.isArray(blockList) && blockList.length > 0) {
      for (let block of blockList) {
        block = new wo.Block(block) // 通过 Peer 返回的是原始数据，要转换成对象。
        if (block.lastBlockHash === my.topBlock.hash && block.verifySig() && block.verifyHash()) {
          // update actions of this block
          if (Array.isArray(block.actionHashList) && block.actionHashList.length > 0 && block.type !== 'VirtBlock') {
            let actionList = await wo.Peer.call('/Block/getActionList', { Block: { hash: block.hash, height: block.height } })
            if (actionList) {
              for (let action of actionList) {
                if (wo[action.type] && typeof wo[action.type].validate === 'function' && wo[action.type].validate(action)) {
                  await wo[action.type].execute(action)
                  await wo[action.type].addOne(action)
                  // todo:需要计算merkelRoot并且验证于区块actionHashRoot的一致性 2.添加到数据库之前对交易(action)序列化
                }
              }
            }
          }
          await Chain.addReward(block)
          await block.addMe()
          await Chain.pushTopBlock(block)
          mylog.info(`高度${block.height}区块同步成功`)
        } else { // 碰到一个错的区块，立刻退出
          mylog.info(`高度${block.height}区块同步错误!`)
          break
        }
      }
      blockList = await wo.Peer.call('/Block/getBlockList', { Block: { height: '>' + my.topBlock.height }, config: { limit: 100, order: 'height ASC' } })
    }
    mylog.info(`全网无最新区块-->停止第${count}轮同步`)
  }
  mylog.info('区块同步完毕')
  my.addingLock = 0
  return my.topBlock
}

Chain.createBlock = async function (block) {
  block = (block instanceof wo.Block) ? block : (new wo.Block(block)) // POT 里调用时，传入的可能是普通对象，需要转成 Block
  block.message = block.message || '矿工留言在第' + (my.topBlock.height + 1) + '区块'
  let actionBatch = wo.Action.getActionBatch()
  block.packMe(actionBatch, my.topBlock, wo.Crypto.secword2keypair(wo.Config.ownerSecword))// 算出默克根、hash、交易表
  await Chain.pushTopBlock(block)
  await Chain.addReward(block)
  await block.addMe() // 将区块写入数据库
  block.executeActions(actionBatch.actionPool)
  return block
}

Chain.appendBlock = async function (block) {
  block = (block instanceof wo.Block) ? block : (new wo.Block(block)) // POT 里调用时，传入的可能是普通对象，需要转成 Block
  if (!my.addingLock && block.lastBlockHash === my.topBlock.hash && block.height === my.topBlock.height + 1 && block.verifySig() && block.verifyHash()) {
    my.addingLock = true
    let actionBatch = wo.Action.getActionBatch()
    await Chain.pushTopBlock(block)
    await Chain.addReward(block)
    await block.addMe()
    block.executeActions(actionBatch.actionPool)
    mylog.info('Block ' + block.height + ' is added')
    my.addingLock = false // 区块添加完毕后 释放锁
    return block
  }
  return null
}

Chain.pushTopBlock = async function (topBlock) { // 保留最高和次高的区块
  my.lastBlock = my.topBlock
  my.topBlock = topBlock
  await wo.Store.pushTopBlock(topBlock)
  if (wo.Socket && wo.Socket.emit) // 启动初始化时，先启动链后启动服务器，所以一开始没有socket直接调用会程序崩溃
  { wo.Socket.emit('newBlock', JSON.stringify(topBlock)) }
  return topBlock
}

Chain.addReward = async function (block) {
  if (block.type === 'SignBlock') {
    block.rewardPacker = block.getReward({ rewardType: 'packerPenalty' })
    await wo.Store.increase(wo.Crypto.pubkey2address(block.winnerPubkey), block.rewardWinner)
    await wo.Store.increase(wo.Crypto.pubkey2address(block.packerPubkey), block.rewardPacker)
  } else {
    await wo.Store.increase(wo.Crypto.pubkey2address(block.winnerPubkey), block.rewardWinner)
    await wo.Store.increase(wo.Crypto.pubkey2address(block.packerPubkey), block.rewardPacker)
  }
}

Chain.getTopBlock = Chain.api.getTopBlock = function () {
  return my.topBlock
}

/** ******************** Private in class *******************/

const my = {
  genesis: {},

  topBlock: null, // 当前已出的最高块

  lastBlock: null, // 当前已出的次高块

  addingLock: false
}
