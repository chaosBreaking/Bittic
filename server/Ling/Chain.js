// var Ling = wo.Ling

/******************** Public of instance ********************/

const DAD=module.exports=function Chain(prop) {
  this._class=this.constructor.name
//  this.setProp(prop)
}
//DAD.__proto__=Ling
const MOM=DAD.prototype
//MOM.__proto__=Ling.prototype

/******************** Shared by instances ********************/

/*********************** Public of class *******************/
DAD.api={} // 面向前端应用的API

DAD._init=async function(){

  if (wo.Config.consensus==='ConsPot'){
    switch (wo.Config.netType){
      case 'mainnet':
        break
      case 'testnet':
        wo.Config.GENESIS_EPOCHE=wo.Config.GENESIS_EPOCHE_TESTNET
        wo.Config.GENESIS_MESSAGE=wo.Config.GENESIS_MESSAGE_TESTNET
        wo.Config.INITIAL_ACCOUNT=wo.Config.INITIAL_ACCOUNT_TESTNET
        break
      case 'devnet': default:
        wo.Config.GENESIS_EPOCHE= Date.time2epoche({type:'prevHour'}) // nextMin: 下一分钟（单机测试）， prevHour: 前一小时（多机测试），或 new Date('2018-07-03T10:15:00.000Z') // 为了方便开发，暂不使用固定的创世时间，而是生成当前时刻之后的第一个0秒，作为创世时间
        wo.Config.GENESIS_MESSAGE=wo.Config.GENESIS_MESSAGE_DEVNET
        wo.Config.INITIAL_ACCOUNT=wo.Config.INITIAL_ACCOUNT_DEVNET
    }
  }

  await DAD.createGenesis()
  await DAD.verifyChainFromDb()
  await DAD.updateChainFromPeer() // todo: 里面多处用到了 wo.Consensus 里的共识特定的方法，导致 Chain 对共识方法产生依赖，这不好。

  wo.Consensus._init()
  
  return this
}

DAD.createGenesis=async function(){
  mylog.info('创世时分 GENESIS_EPOCHE='+wo.Config.GENESIS_EPOCHE.toJSON())
  my.genesis=new wo.Block({
    timestamp:wo.Config.GENESIS_EPOCHE,
    message:wo.Config.GENESIS_MESSAGE
  })
  await my.genesis.packMe([], null, wo.Crypto.secword2keypair(wo.Config.GENESIS_ACCOUNT.secword))
  mylog.info('genesis is created and verified: '+my.genesis.verifySig())

  DAD.pushTopBlock(my.genesis)

  mylog.info('清空并初始化账户...')
  await wo.Token.dropAll({Token:{version:'!=null'}})
  await wo.TokenAccount.dropAll({TokenAccount:{version:'!=null'}})
  await wo.Account.dropAll({Account:{version:'!=null'}})
  await wo.Account.addOne({Account:{ balance: wo.Config.COIN_INIT_AMOUNT, address:wo.Config.INITIAL_ACCOUNT.address }})
  mylog.info('net ================ '+wo.Config.netType)
  if (wo.Config.netType==='devnet') // 在开发链上，自动给当前用户预存一笔，使其能够挖矿
    await wo.Account.addOne({Account:{ balance: 100000, address:wo.Crypto.secword2address(wo.Config.ownerSecword)}})
  
  return my.genesis
}

DAD.verifyChainFromDb=async function(){ // 验证本节点已有的区块链
  mylog.info('开始验证数据库中的区块')
  await wo.Account.dropAll({Account:{version:'!=null'}})
  await wo.Account.addOne({Account:{ balance: wo.Config.COIN_INIT_AMOUNT, address:wo.Config.INITIAL_ACCOUNT.address }})
  if (wo.Config.netType==='devnet') // 在开发链上，自动给当前用户预存一笔，使其能够挖矿
    await wo.Account.addOne({Account:{ balance: 100000, address:wo.Crypto.secword2address(wo.Config.ownerSecword)}})

//  let top=(await wo.Block.getCount()).count
//  mylog.info('共有'+top+'个区块在数据库')
  await wo.Block.dropAll({Block:{height:'<='+wo.Config.GENESIS_HEIGHT}}) // 极端罕见的可能，有错误的（为了测试，手工加入的）height<创世块的区块，也删掉它。  
  let blockList=await wo.Block.getAll({Block:{height:'>'+my.topBlock.height}, config:{limit:100, order:'height ASC'}})
  while (Array.isArray(blockList) && blockList.length>0){ // 遍历数据库里的区块链，保留有效的区块，删除所有错误的。
    mylog.info('这一轮取出了'+blockList.length+'个区块')
    for (let block of blockList){
      if(block.type==="VirtBlock")  //如果是虚拟块，尝试从邻居数据库里拿到正常块并替换
      {
        var realBlock = await wo.Peer.randomcast('/Block/getBlock', { Block:{height:block.height}})
        realBlock=new wo.Block(realBlock)
        if (realBlock&&realBlock.type!=="VirtBlock"&&realBlock.lastBlockHash ===block.hash&&realBlock.height===block.height&&realBlock.verifyHash()&&realBlock.verifySig())
        {        
          block.dropMe()
          await DAD.updateChainFromPeer()
          return my.topBlock
        }
      }
      if (block.lastBlockHash===my.topBlock.hash && /*block.height===my.topBlock.height+1 &&*/ block.verifySig() && block.verifyHash())
      {
        mylog.info('block '+block.height+' is verified')
        if ( await block.verifyActionList() ){
          DAD.pushTopBlock(block)
          mylog.info('成功验证区块：'+block.height)
        }
        else {
          mylog.warn('block '+block.height+' 验证失败！从数据库中删除...')
          await block.dropMe() // 注意，万一删除失败，会导致无限循环下去
        }
      }
      else
      {
        mylog.warn('block '+block.height+' 验证失败！从数据库中删除...')
        await block.dropMe() // 注意，万一删除失败，会导致无限循环下去
      }

    }
// 万一还有 height=my.topBlock.height 的区块，需要先删除。因为下一步是直接获取 height>my.topBlock.height
// 此外，这一步很危险，如果height存在，hash不存在，那么无法删除；如果height不存在，那么会不会删除所有？？
    await wo.Block.dropAll({Block:{height:my.topBlock.height, hash:'!='+my.topBlock.hash}})
    blockList=await wo.Block.getAll({Block:{height:'>'+my.topBlock.height}, config:{limit:100, order:'height ASC'}})
  }
  mylog.info('...数据库中的区块验证完毕')

  if (my.topBlock.height===wo.Config.GENESIS_HEIGHT) {
    mylog.info('数据库中没有区块，所以清空事务')
    await wo.Action.dropAll({Action:{version:'!=null'}})
  }

  return my.topBlock
}

DAD.updateChainFromPeer=async function(){ // 向其他节点获取自己缺少的区块；如果取不到最高区块，就创建虚拟块填充。
  mylog.info('开始向邻居节点同步区块')
  for (let count = 0; wo.Config.consensus==="ConsPot" && Date.time2height()>(my.topBlock.height+1) && count<10; count++){ // 确保更新到截至当前时刻的最高区块。
    let blockList=await wo.Peer.randomcast('/Block/getBlockList', { Block:{height:'>'+my.topBlock.height}, config:{limit:100, order:'height ASC'} })
    while (Array.isArray(blockList) && blockList.length>0){
      for (let block of blockList){
        block=new wo.Block(block) // 通过 Peer 返回的是原始数据，要转换成对象。
        if (block.lastBlockHash===my.topBlock.hash && /*block.height===my.topBlock.height+1 &&*/ block.verifySig() && block.verifyHash())
        {
          await block.addMe()
          mylog.info('block '+block.height+' is updated')
          // update actions of this block
          if (Array.isArray(block.actionHashList) && block.actionHashList.length>0&&block.type!=="VirtBlock") { 
            var actionList = await wo.Peer.randomcast('/Block/getActionList', { Block:{ hash:block.hash, height:block.height } })
            if (actionList){
              for (let actionData of actionList) {
                var action=new wo[actionData.type](actionData)
                if (action.validate()) {
                  await action.execute()
                  await action.addMe()
                }
              }
            }
          }
          if (wo.Config.consensus==='ConsPot') wo.Consensus.pushInRBS(block)
          DAD.pushTopBlock(block)
        }
        else{ // 碰到一个错的区块，立刻退出
          mylog.info('block '+block.height+' 同步有错误！')
          var signalBadBlock=true
          break
        }
      }
      if (signalBadBlock) {
        signalBadBlock=undefined
        break
      }
      blockList=await wo.Peer.randomcast('/Block/getBlockList', { Block:{height:'>'+my.topBlock.height}, config:{limit:100, order:'height ASC'} })
    }
    mylog.info('当前连接的节点没有新的区块了')
  }
  if(Date.time2height() - my.topBlock.height > 1){
    for (let height=my.topBlock.height+1; wo.Config.consensus ==='ConsPot' && height<Date.time2height(); height++) {
      await DAD.createVirtBlock()
    }
  }
  else{
    return my.topBlock
  }
  if (wo.Config.consensus ==='ConsPot') mylog.info(new Date()+'...已同步到区块='+my.topBlock.height+'，当前时刻的待出区块='+Date.time2height())
  else mylog.info('...向邻居节点同步区块完毕')
  return my.topBlock
}

DAD.createVirtBlock=async function(){
  var block=new wo.Block({type:'VirtBlock', timestamp:new Date(), height:my.topBlock.height+1, hash:my.topBlock.hash, lastBlockHash:my.topBlock.hash})
  await block.addMe()
  DAD.pushTopBlock(block)
  if (wo.Config.consensus==='ConsPot') wo.Consensus.pushInRBS(block)
  mylog.info('virtual block '+block.height+' is created')
  return block
}
DAD.createBlock=async function(block){
  block= (block instanceof wo.Block)?block:(new wo.Block(block)) // POT 里调用时，传入的可能是普通对象，需要转成 Block
  block.message='矿工留言在第'+(my.topBlock.height+1)+'区块'
  await block.packMe(wo.Consensus.currentActionPool||wo.Action.actionPool, my.topBlock, wo.Crypto.secword2keypair(wo.Config.ownerSecword))//算出默克根、hash、交易表
  await block.addMe()     //将区块写入数据库
  let winnerAccount = await wo.Account.getOne({Account:{address:wo.Crypto.pubkey2address(block.winnerPubkey)}})
  if (winnerAccount) await winnerAccount.setMe({Account:{balance:winnerAccount.balance+block.rewardWinner},cond:{address:winnerAccount.address},excludeSelf:true})
  let packerAccount = await wo.Account.getOne({Account:{address:wo.Crypto.pubkey2address(block.packerPubkey)}})
  if (packerAccount) await packerAccount.setMe({Account:{balance:packerAccount.balance+block.rewardPacker},cond:{address:packerAccount.address},excludeSelf:true})  

  DAD.pushTopBlock(block)
  if (wo.Config.consensus==='ConsPot') wo.Consensus.pushInRBS(block)
  // mylog.info('block '+block.height+' is created')
  return block
}
DAD.appendBlock=async function(block){ // 添加别人打包的区块
  block= (block instanceof wo.Block)?block:(new wo.Block(block)) // POT 里调用时，传入的可能是普通对象，需要转成 Block
  if (!my.addingLock&&(block.lastBlockHash===my.topBlock.hash && block.height===my.topBlock.height+1 && block.verifySig() && block.verifyHash())){
    // todo: push action into database
    //因为异步操作会重复添加，先将锁锁定，防止因为没有及时pushTopBlock多次添加符合条件的区块
    //先判断是否符合条件、符合条件的块 才加锁
    my.addingLock = true
    for (var actionHash of block.actionHashList){
      let action=wo.Action.actionPool[actionHash]
      if (action) {
        action.blockHash = block.hash
        await action.execute()
        await action.addMe()
        delete wo.Action.actionPool[actionHash]
      }else{
        // 向对等节点或打包节点要求获取该缺失的action
        mylog.info("缺少该Action,向邻居请求")
        let missAction=wo.Peer.broadcast('/Action/getAction', {Action:{ hash:actionHash }})
        action.blockHash = block.hash
        await missAction.execute()
        await missAction.addMe()
      }
    }
    if (block.type==="SignBlock") {
      block.rewardPacker = block.getReward({rewardType:'packerPenalty'})
      let winnerAccount = await wo.Account.getOne({Account:{address:wo.Crypto.pubkey2address(block.winnerPubkey)}})
      if (winnerAccount) await winnerAccount.setMe({Account:{balance:winnerAccount.balance+block.rewardWinner},cond:{address:winnerAccount.address},excludeSelf:true})
      let packerAccount = await wo.Account.getOne({Account:{address:wo.Crypto.pubkey2address(block.packerPubkey)}})
      if (packerAccount) await packerAccount.setMe({Account:{balance:packerAccount.balance+block.rewardPacker},cond:{address:packerAccount.address},excludeSelf:true})        
    }else if (block.type!=='VirtBlock'){
      let winnerAccount = await wo.Account.getOne({Account:{address:wo.Crypto.pubkey2address(block.winnerPubkey)}})
      if (winnerAccount) await winnerAccount.setMe({Account:{balance:winnerAccount.balance+block.rewardWinner},cond:{address:winnerAccount.address},excludeSelf:true})
      let packerAccount = await wo.Account.getOne({Account:{address:wo.Crypto.pubkey2address(block.packerPubkey)}})
      if (packerAccount) await packerAccount.setMe({Account:{balance:packerAccount.balance+block.rewardPacker},cond:{address:packerAccount.address},excludeSelf:true})        
    }
    await block.addMe()
    DAD.pushTopBlock(block)
    if (wo.Config.consensus==='ConsPot') wo.Consensus.pushInRBS(block)
    //区块添加完毕后 释放锁
    my.addingLock = false 
    mylog.info(block.timestamp.toJSON() + ' : block '+block.height+' is added')
    return block
  }
  return null
}

DAD.getTopBlock = DAD.api.getTopBlock = function(){
  return my.topBlock
}

DAD.pushTopBlock=function(topBlock){ // 保留最高和次高的区块
  my.lastBlock=my.topBlock
  my.topBlock=topBlock
}

/********************** Private in class *******************/

const my={
  genesis:{}
  ,
  topBlock:null // 当前已出的最高块
  ,
  lastBlock:null // 当前已出的次高块
  ,
  addingLock:false
  ,
//  keypair:null // 启动时，从配置文件里读出节点主人的secword，计算出公私钥
//  ,

}
