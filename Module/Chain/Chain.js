// var Ling = wo.Ling
const Schedule = require('node-schedule')

/******************** Public of instance ********************/

const DAD = module.exports = function Chain(prop) {
  this._class = this.constructor.name
  //  this.setProp(prop)
}
//DAD.__proto__=Ling
const MOM = DAD.prototype
//MOM.__proto__=Ling.prototype

/******************** Shared by instances ********************/

/*********************** Public of class *******************/
DAD.api = {} // 面向前端应用的API

DAD._init = async function () {

  if (wo.Config.consensus === 'ConsPot') {
    switch (wo.Config.netType) {
      case 'mainnet':
        break
      case 'testnet':
        wo.Config.GENESIS_EPOCHE = wo.Config.GENESIS_EPOCHE_TESTNET
        wo.Config.GENESIS_MESSAGE = wo.Config.GENESIS_MESSAGE_TESTNET
        wo.Config.INITIAL_ACCOUNT = wo.Config.INITIAL_ACCOUNT_TESTNET
        break
      case 'devnet': default:
        wo.Config.GENESIS_EPOCHE = Date.time2epoche({ type: 'prevHour' }) // nextMin: 下一分钟（单机测试）， prevHour: 前一小时（多机测试），或 new Date('2018-07-03T10:15:00.000Z') // 为了方便开发，暂不使用固定的创世时间，而是生成当前时刻之后的第一个0秒，作为创世时间
        wo.Config.GENESIS_MESSAGE = wo.Config.GENESIS_MESSAGE_DEVNET
        wo.Config.INITIAL_ACCOUNT = wo.Config.INITIAL_ACCOUNT_DEVNET
    }
  }

  await DAD.createGenesis()
  await DAD.verifyChainFromDb()
  await DAD.updateChainFromPeer()

  return this
}

DAD.createGenesis = async function () {
  mylog.info('Net ================ ' + wo.Config.netType)
  mylog.info('创世时分 GENESIS_EPOCHE=' + wo.Config.GENESIS_EPOCHE.toJSON())
  my.genesis = new wo.Block({
    timestamp: wo.Config.GENESIS_EPOCHE,
    message: wo.Config.GENESIS_MESSAGE
  })
  my.genesis.packMe({}, null, wo.Crypto.secword2keypair(wo.Config.GENESIS_ACCOUNT.secword))
  await DAD.pushTopBlock(my.genesis)
  mylog.info('Genesis is created and verified: ' + my.genesis.verifySig())
  await wo.Store.increase(wo.Config.INITIAL_ACCOUNT.address, wo.Config.COIN_INIT_AMOUNT)
  if (wo.Config.netType === 'devnet') {
    // 在开发链上，自动给当前用户预存一笔，使其能够挖矿
    //给两个账户加钱，防止两机测试时互不相认
    await wo.Store.increase('Ttm24Wb877P6EHbNKzswoK6yvnTQqFYaqo', 100000);
    await wo.Store.increase('TxAEimQbqVRUoPncGLrrpmP82yhtoLmxJE', 100000);
  }
  return my.genesis
}

DAD.verifyChainFromDb = async function () { // 验证本节点已有的区块链
  mylog.info('开始验证数据库中的区块')
  await wo.Block.dropAll({ Block: { height: '<=' + wo.Config.GENESIS_HEIGHT } }) // 极端罕见的可能，有错误的（为了测试，手工加入的）height<创世块的区块，也删掉它。  
  let blockList = await wo.Block.getAll({ Block: { height: '>' + my.topBlock.height }, config: { limit: 100, order: 'height ASC' } })
  while (Array.isArray(blockList) && blockList.length > 0 && my.topBlock.height < Date.time2height() - 1) { // 遍历数据库里的区块链，保留有效的区块，删除所有错误的。
    mylog.info('取出' + blockList.length + '个区块')
    for (let block of blockList) {
      if (block.height > Date.time2height() - 1) break
      if (block.type === "VirtBlock")  //如果是虚拟块，尝试从邻居数据库里拿到正常块并替换
      {
        let realBlock = await wo.Peer.randomcast('/Block/getBlock', { Block: { height: block.height } })
        if (realBlock) {
          realBlock = new wo.Block(realBlock)
          if (realBlock &&
            realBlock.type !== "VirtBlock" &&
            realBlock.lastBlockHash === block.hash &&
            realBlock.height === block.height &&
            realBlock.verifyHash() &&
            realBlock.verifySig()) {
            await block.dropMe(); //其他节点合法块而本节点是虚拟块，可以直接停止验证而开始向其他节点更新
            return 0;
          }
        }
        //fallback 没有拿到可以替换虚拟块的合法块
        DAD.pushTopBlock(block)
        mylog.info('成功验证区块：' + block.height)
      }
      else if (block.lastBlockHash === my.topBlock.hash && block.verifySig() && block.verifyHash()) {
        if (await block.verifyActionList()) {
          mylog.info('成功验证区块：' + block.height)
          DAD.pushTopBlock(block)
        }
        else {
          mylog.warn('block ' + block.height + ' 验证失败！从数据库中删除...')
          await block.dropMe() // 注意，万一删除失败，会导致无限循环下去
        }
      }
      else {
        //fallback -> 无法通过验证的块
        mylog.warn('block ' + block.height + ' 验证失败！从数据库中删除...')
        await block.dropMe() // 注意，万一删除失败，会导致无限循环下去
      }
    }
    // 万一还有 height=my.topBlock.height 的区块，需要先删除。因为下一步是直接获取 height>my.topBlock.height
    // 此外，这一步很危险，如果height存在，hash不存在，那么无法删除；如果height不存在，那么会不会删除所有？？
    await wo.Block.dropAll({ Block: { height: my.topBlock.height, hash: '!=' + my.topBlock.hash } });
    blockList = await wo.Block.getAll({ Block: { height: '>' + my.topBlock.height }, config: { limit: 100, order: 'height ASC' } })
  }
  await wo.Block.dropAll({ Block: { height: '>' + my.topBlock.height } })
  mylog.info('...数据库中的区块验证完毕')

  if (my.topBlock.height === wo.Config.GENESIS_HEIGHT) {
    mylog.info('数据库中没有区块，所以清空事务')
    await wo.Action.dropAll({ Action: { version: '!=null' } })
  }

  return my.topBlock
}

DAD.updateChainFromPeer = async function () { // 向其他节点获取自己缺少的区块；如果取不到最高区块，就创建虚拟块填充。
  mylog.info('开始向邻居节点同步区块');
  if (my.addingLock) return 0;
  my.addingLock = 1;
  for (let count = 0; wo.Config.consensus === "ConsPot" && Date.time2height() > (my.topBlock.height + 1) && count < 3; count++) { // 确保更新到截至当前时刻的最高区块。
    mylog.info(`向全网广播同步请求-->开始第${count}轮同步`);
    let blockList = await wo.Peer.randomcast('/Block/getBlockList', { Block: { height: '>' + my.topBlock.height }, config: { limit: 100, order: 'height ASC' } })
    if (Array.isArray(blockList) && blockList.length > 0) {
      for (let block of blockList) {
        block = new wo.Block(block) // 通过 Peer 返回的是原始数据，要转换成对象。
        if (block.lastBlockHash === my.topBlock.hash && block.verifySig() && block.verifyHash()) {
          // update actions of this block
          if (Array.isArray(block.actionHashList) && block.actionHashList.length > 0 && block.type !== "VirtBlock") {
            let actionList = await wo.Peer.randomcast('/Block/getActionList', { Block: { hash: block.hash, height: block.height } })
            if (actionList) {
              for (let action of actionList) {
                if (wo[action.type] && typeof wo[action.type].validator === 'function' && wo[action.type].validator(action)) {
                  await wo[action.type].execute(action)
                  await wo[action.type].addOne(action)
                  //todo:1.需要计算merkelRoot并且验证于区块actionHashRoot的一致性 2.添加到数据库之前对交易(action)序列化
                }
              }
            }
          }
          await block.addMe();
          await DAD.pushTopBlock(block)
          mylog.info(`高度${block.height}区块同步成功`)
        }
        else { // 碰到一个错的区块，立刻退出
          mylog.info(`高度${block.height}区块 同步错误!`)
          break
        }
      }
      blockList = await wo.Peer.randomcast('/Block/getBlockList', { Block: { height: '>' + my.topBlock.height }, config: { limit: 100, order: 'height ASC' } })
    }
    mylog.info(`全网无最新区块-->停止第${count}轮同步`)
  }
  if (Date.time2height() - my.topBlock.height > 1) {
    for (let height = my.topBlock.height + 1; wo.Config.consensus === 'ConsPot' && height < Date.time2height(); height++) {
      await DAD.createVirtBlock()
    }
  }
  if (wo.Config.consensus === 'ConsPot')
    mylog.info(new Date() + '...已同步到区块=' + my.topBlock.height + '，当前时刻的待出区块=' + Date.time2height())
  else
    mylog.info('区块同步完毕');
  my.addingLock = 0;
  return my.topBlock
}

DAD.createVirtBlock = async function () {
  var block = new wo.Block({ type: 'VirtBlock', timestamp: new Date(), height: my.topBlock.height + 1, hash: my.topBlock.hash, lastBlockHash: my.topBlock.hash })
  await block.addMe()
  DAD.pushTopBlock(block)
  mylog.info('virtual block ' + block.height + ' is created')
  return block
}

DAD.createBlock = async function (block) {
  block = (block instanceof wo.Block) ? block : (new wo.Block(block)) // POT 里调用时，传入的可能是普通对象，需要转成 Block
  block.message = block.message || '矿工留言在第' + (my.topBlock.height + 1) + '区块'
  let actionBatch = wo.Action.getActionBatch();
  block.packMe(actionBatch, my.topBlock, wo.Crypto.secword2keypair(wo.Config.ownerSecword))//算出默克根、hash、交易表
  await DAD.pushTopBlock(block);
  DAD.addReward(block);
  block.addMe();     //将区块写入数据库
  block.executeActions(actionBatch.actionPool);
  // wo.Socket.emit('newBlock',JSON.stringify(block));
  return block
}

//因为异步操作会重复添加，先将锁锁定，防止因为没有及时pushTopBlock多次添加符合条件的区块
//先判断是否符合条件、符合条件的块 才加锁
DAD.appendBlock = async function (block) {
  block = (block instanceof wo.Block) ? block : (new wo.Block(block)) // POT 里调用时，传入的可能是普通对象，需要转成 Block
  if (!my.addingLock && block.lastBlockHash === my.topBlock.hash && block.height === my.topBlock.height + 1 && block.verifySig() && block.verifyHash()) {
    my.addingLock = true;
    let actionBatch = wo.Action.getActionBatch();
    await DAD.pushTopBlock(block);
    await block.addMe();
    DAD.addReward(block);
    block.executeActions(actionBatch.actionPool);
    mylog.info(block.timestamp.toJSON() + ' : block ' + block.height + ' is added');
    my.addingLock = false;    //区块添加完毕后 释放锁
    // wo.EventBus.send(232, block);
    // wo.Peer.broadcast('/Consensus/mineWatcher', {Block:JSON.stringify(wo.Store.getTopBlock())})
    return block;
  }
  return null
}

DAD.pushTopBlock = async function (topBlock) { // 保留最高和次高的区块
  my.lastBlock = my.topBlock;
  my.topBlock = topBlock;
  await wo.Store.pushTopBlock(topBlock);
  return topBlock
}

DAD.addReward = async function (block) {
  if (block.type === "SignBlock") {
    block.rewardPacker = block.getReward({ rewardType: 'packerPenalty' })
    await wo.Store.increase(wo.Crypto.pubkey2address(block.winnerPubkey), block.rewardWinner);
    await wo.Store.increase(wo.Crypto.pubkey2address(block.packerPubkey), block.rewardPacker);
  }
  else {
    await wo.Store.increase(wo.Crypto.pubkey2address(block.winnerPubkey), block.rewardWinner);
    await wo.Store.increase(wo.Crypto.pubkey2address(block.packerPubkey), block.rewardPacker);
  }
}

DAD.getTopBlock = DAD.api.getTopBlock = function () {
  return my.topBlock
}

DAD.api.test = async function () {
  return await wo.EventBus.call('Consensus', 'api', 'test')
}


/********************** Private in class *******************/

const my = {
  genesis: {}
  ,
  topBlock: null // 当前已出的最高块
  ,
  lastBlock: null // 当前已出的次高块
  ,
  addingLock: false
  ,
  scheduleJobs: []
}
