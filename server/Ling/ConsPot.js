// 共识模块

const Schedule=require('node-schedule')

/******************** Public of instances ********************/

const DAD=module.exports=function ConsPot(prop) {
  this._class=this.constructor.name
//  this.setProp(prop)
}
//DAD.__proto__=Ling
const MOM=DAD.prototype
//MOM.__proto__=Ling.prototype

/******************** Shared by instances ********************/

/*********************** Public of class *********************/

DAD.api={}
DAD.currentActionPool={} // 用于POT，仅仅包含0~40秒的交易。

// 第一阶段：签名
DAD.signOnce=async function(){
  //  todo: 检查高度是否正确，如果不正确，把my.signBlock添加进去
  var heightNow=Date.time2height()
  mylog.info('此刻时间对应的区块高度='+heightNow)
  mylog.info('此刻本机链的最高块='+wo.Chain.getTopBlock().height)
  // console.log(my.recBlockStack)
  // console.log(my.recBlockStack.length)
  if (heightNow === wo.Chain.getTopBlock().height+2 && my.signBlock && wo.Chain.getTopBlock().height===my.signBlock.height-1) { // 上一块没有及时出现
    let result = await wo.Peer.randomcast('/Block/getBlock', { Block:{height : wo.Chain.getTopBlock().height+1} })
    if(result && result.height ===  wo.Chain.getTopBlock().height+1)
    {
      let topBlock = new wo['Block'](result)
      await wo.Chain.appendBlock(topBlock)
    }
    if(!result||heightNow === wo.Chain.getTopBlock().height+2)
    {
      mylog.info('上轮获胜节点错过出块！使用空块')
      await wo.Chain.appendBlock(my.signBlock)
      my.signBlock=null
    }
  }else if (heightNow>wo.Chain.getTopBlock().height+1) {
    mylog.info('准备更新缺少的区块：heightNow='+heightNow+'，当前本机链的最高块='+wo.Chain.getTopBlock().height)
    await wo.Chain.updateChainFromPeer()
  }
  
  heightNow=Date.time2height()
  if (heightNow===wo.Chain.getTopBlock().height+1 && new Date().getSeconds()<15 ) { // 注意，前面的同步可能花了20多秒，到这里已经是在竞选阶段。所以再加个当前秒数的限制。
    mylog.info(new Date()+'：签名阶段开始 for block='+(wo.Chain.getTopBlock().height+1)+' using block='+wo.Chain.getTopBlock().height)
    mylog.info('重置sigPool/packerPool/selfPot/bestPot，来接收这一轮的签名。')
    my.signerPool={}
    my.packerPool={}
    my.selfPot={} // 注意，不要 my.selfPot=my.bestPot={} 这样指向了同一个对象！
    my.bestPot={} // 如果设signature=null，就可能会===compareSig返回的null，就产生错误了。因此保留为undefined.
    mylog.info("合法事务池长度**********",Object.keys(DAD.currentActionPool).length)
    mylog.info("待办事务池长度**********",Object.keys(wo.Action.actionPool).length)
    DAD.currentActionPool={}
    // 作为节点，把自己签名直接交给自己。这是因为，全网刚起步时，很可能还没有终端用户，这时需要节点进行签名。
    var me=await wo.Account.getOne({Account:{address: wo.Crypto.secword2address(wo.Config.ownerSecword)}})
    if (me && me.balance>0){
      let message={ timestamp:new Date(), blockHash:wo.Chain.getTopBlock().hash, height:heightNow }
      let signature=wo.Crypto.sign(message, wo.Crypto.secword2keypair(wo.Config.ownerSecword).seckey)
      let pubkey=wo.Crypto.secword2keypair(wo.Config.ownerSecword).pubkey
      my.signerPool[pubkey]={ message:message, signature:signature }
      my.selfPot.signature=signature
      my.selfPot.message=message
      my.selfPot.pubkey=pubkey
    }
    my.currentPhase='signing'
  }
}
DAD.api.signWatcher=async function(option) { // 监听收集终端用户的签名
  if (option && option.message && option.signature && option.pubkey && option.netType) {
    if (my.currentPhase==='signing' 
        && !my.signerPool.hasOwnProperty(option.pubkey) // 对一个用户，只采集其一个签名
        && wo.Crypto.verify(option.message, option.signature, option.pubkey) // 签名有效
        && Date.time2height(option.message.timestamp)===Date.time2height()
        && option.message.blockHash===wo.Chain.getTopBlock().hash
        && wo.Crypto.compareSig(wo.Chain.getTopBlock().hash, my.selfPot.signature, option.signature)!==my.selfPot.signature // 注意，my.selfPot.signature有可能是undefined
        && option.netType === wo.Config.netType // 前端应用的链，和后台节点的链相同
      ) { // 比我现有最好的更好
      var user=await wo.Account.getOne({Account:{address: wo.Crypto.pubkey2address(option.pubkey)}})
      if (user && user.balance>0) { // 只有账户里有币的用户才能挖矿。
        my.signerPool[option.pubkey]={message:option.message, signature:option.signature} 
        my.selfPot.signature = option.signature // 随时更新到最佳的签名
        my.selfPot.message=option.message
        my.selfPot.pubkey=option.pubkey
        mylog.info('终端用户的时间证明验证成功、并且获胜：'+JSON.stringify(option.signature)+' 来自地址 '+wo.Crypto.pubkey2address(option.pubkey))
      }
    }
  }
}

// 第二阶段：竞选
DAD.electOnce=async function(){
  if (Date.time2height()===wo.Chain.getTopBlock().height+1) {
    mylog.info(new Date()+'：竞选阶段开始 for block='+(wo.Chain.getTopBlock().height+1)+' using block='+wo.Chain.getTopBlock().height)
    my.currentPhase='electing'
//    let sigList=Object.keys(my.signerPool)
//    mylog.info('sigList['+sigList.length+']='+JSON.stringify(sigList))
    if (my.selfPot.signature) { // todo: 更好的是核对（签名针对的区块高度===当前竞选针对的区块高度） 
//      wo.Crypto.sortSigList(wo.Chain.getTopBlock().hash, sigList) // 对签名池排序
      my.bestPot.signature=my.selfPot.signature // 把本节点收到的用户最佳签名，暂时记为全网最佳。
      my.bestPot.message=my.selfPot.message
      my.bestPot.pubkey=my.selfPot.pubkey
      my.signBlock=new wo.Block({winnerMessage:my.selfPot.message, winnerSignature:my.selfPot.signature, winnerPubkey:my.selfPot.pubkey, type:'SignBlock'}) // 把候选签名打包进本节点的虚拟块
      await my.signBlock.packMe([], wo.Chain.getTopBlock(), wo.Crypto.secword2keypair(wo.Config.ownerSecword))
//      mylog.info('广播虚拟块：'+JSON.stringify(my.signBlock))
      wo.Peer.broadcast('/Consensus/electWatcher', {Block:JSON.stringify(my.signBlock)})
    }else{
      mylog.info('本节点没有收集到时间证明，本轮不参与竞选')
    }
  }
}
DAD.api.electWatcher=async function(option) { // 互相转发最优的签名块
  if (my.currentPhase==='electing' && option && option.Block && (!my.signBlock || option.Block.hash !== my.signBlock.hash)
      && option.Block.winnerSignature!==my.bestPot.signature // 不要重复接收同一个最佳块
      && !my.packerPool.hasOwnProperty(option.Block.packerPubkey) // 一个packer只允许出一个签
      && option.Block.packerPubkey!==wo.Crypto.secword2keypair(wo.Config.ownerSecword).pubkey
      && wo.Crypto.verify(option.Block.winnerMessage, option.Block.winnerSignature, option.Block.winnerPubkey)
      && option.Block.lastBlockHash === wo.Chain.getTopBlock().hash
      && wo.Block.verifySig(option.Block) &&  wo.Block.verifyHash(option.Block)
  ){
//    mylog.info('Received SignBlock: '+JSON.stringify(option.Block.winnerSignature)+', '+JSON.stringify(wo.Crypto.pubkey2address(option.Block.packerPubkey)))
    my.packerPool[option.Block.packerPubkey]=option.Block
    let user=await wo.Account.getOne({Account:{address: wo.Crypto.pubkey2address(option.Block.winnerPubkey)}})
    let packer = await wo.Account.getOne({Account:{address: wo.Crypto.pubkey2address(option.Block.packerPubkey)}})
    if (wo.Crypto.compareSig(wo.Chain.getTopBlock().hash, my.bestPot.signature, option.Block.winnerSignature)===option.Block.winnerSignature // 新收到的签名获胜了。注意，my.bestPot.signature有可能是undefined
        && user && user.balance>0 && packer.balance > wo.Config.PACKER_THRESHOLD) {
      mylog.info('收到了更好的POT空块：签名='+option.Block.winnerSignature+' 来自地址 '+wo.Crypto.pubkey2address(option.Block.winnerPubkey))
      my.bestPot.signature=option.Block.winnerSignature
      my.bestPot.pubkey=option.Block.winnerPubkey
      my.bestPot.message=option.Block.winnerMessage
      my.signBlock=option.Block // 保存新收到的虚拟块
      wo.Peer.broadcast('/Consensus/electWatcher', {Block:JSON.stringify(option.Block)}) // 就进行广播
      return my.signBlock
    }else{ // 对方的签名不如我的，就把我的最优签名告知它
      return my.signBlock
    }
  }
  else if (
  // option && option.Block && (!my.signBlock || option.Block.hash !== my.signBlock.hash)
      wo.Crypto.verify(option.Block.winnerMessage, option.Block.winnerSignature, option.Block.winnerPubkey)      
      && option.Block.lastBlockHash !== wo.Chain.getTopBlock().hash
      && wo.Block.verifySig(option.Block) 
      && wo.Block.verifyHash(option.Block)
  ){
    mylog.info("收到分叉时间证明区块，来自用户："+wo.Crypto.pubkey2address(option.Block.winnerPubkey))
    mylog.info("收到分叉时间证明区块，来自节点："+wo.Crypto.pubkey2address(option.Block.packerPubkey))    
    mylog.info("本机上一区块HASH: " + wo.Chain.getTopBlock().hash)
    mylog.info("分叉签名块上区块哈希: " + option.Block.lastBlockHash)
    mylog.info("开始处理分叉.........")
    DAD.forkHandler(option)
  }
  else if( !wo.Block.verifySig(option.Block) || !wo.Block.verifyHash(option.Block))
  {
    mylog.info("收到无法通过验证的POT空块：")
    mylog.info("来自用户："+wo.Crypto.pubkey2address(option.Block.winnerPubkey))
    mylog.info("来自节点："+wo.Crypto.pubkey2address(option.Block.packerPubkey))    
    mylog.info("上区块哈希: " + option.Block.lastBlockHash)    
    mylog.info("本机上一区块HASH: " + wo.Chain.getTopBlock().hash)
  }
}
DAD.api.shareWinner=async function(option){
  // if (option.winnerSignature === my.bestPot.signature)
    return my.signBlock
}

// 第三阶段：出块，或接收获胜者打包广播的区块，
DAD.mineOnce=async function(){
  if (Date.time2height()===wo.Chain.getTopBlock().height+1) {
    mylog.info(new Date()+'：出块阶段开始 for block='+(wo.Chain.getTopBlock().height+1)+' using block='+wo.Chain.getTopBlock().height)
    mylog.info('全网最终获胜签名='+my.bestPot.signature)
    mylog.info('本节点的候选签名='+my.selfPot.signature)
    my.currentPhase='mining'
    if (my.selfPot.signature && my.bestPot.signature===my.selfPot.signature) { // 全网最终获胜者是我自己，于是打包并广播。注意防止 bestPot===selfPot===undefined，这是跳过竞选阶段直接从前两阶段开始会发生的。
      mylog.info('本节点是获胜者！')
      // let winner=await wo.Peer.randomcast('/Consensus/shareWinner')
      // if (winner && winner.signature===my.selfPot.signature) {
        let block = await wo.Chain.createBlock({winnerMessage:my.selfPot.message,winnerSignature:my.selfPot.signature, winnerPubkey:my.selfPot.pubkey})
        block.runActionList(DAD.currentActionPool)  //不能阻塞出块。todo: 潜在问题，有的交易也许并不能成功执行，但是却已经放在区块里。
        wo.Peer.broadcast('/Consensus/mineWatcher', {Block:JSON.stringify(wo.Chain.getTopBlock())})
        mylog.info('本节点出块的哈希为：'+wo.Chain.getTopBlock().hash)
      // }
    }else{
      mylog.info('本节点没有赢:(')
    }
  }
}

DAD.api.mineWatcher=async function(option){ // 监听别人发来的区块
  if (my.currentPhase==='mining' && option && option.Block
      && option.Block.winnerSignature===my.bestPot.signature && my.bestPot.signature!==my.selfPot.signature 
      && option.Block.lastBlockHash===wo.Chain.getTopBlock().hash && option.Block.height===wo.Chain.getTopBlock().height+1
    ) { // 注意不要接受我自己作为获胜者创建的块，以及不要重复接受已同步的区块
        // mylog.info('收到赢家的区块：winnerSignature='+my.bestPot.signature)
    if (await wo.Chain.appendBlock(option.Block)) {
      wo.Peer.broadcast('/Consensus/mineWatcher', {Block:JSON.stringify(wo.Chain.getTopBlock())})
      mylog.info('本节点收到赢家的区块哈希为：'+wo.Chain.getTopBlock().hash)
    }
  }
  return null
}

DAD.actionLoop = async function(){
  //事务处理循环：拿出actionPool里的事务--->执行并放入currentActionPool--->从删除actionPool删除
  //对外可见的即是 currentActionPool
  // console.log("*********LOOP********")
  // mylog.info('actionLoop is running')
  while(my.currentPhase!=='mining' && Object.keys(wo.Action.actionPool).length>0){
    // if(wo.Consensus.currentPhase!=="mining"&&Object.keys(DAD.actionPool).length!==0)
    // if (wo.Action.actionPool.length>0) {
      action = Object.values(wo.Action.actionPool).shift()
    // action.execute()
      DAD.currentActionPool[action.hash] = action
      wo.Block.totalAmount +=  (action.amount||0)
      wo.Block.totalFee +=  (action.fee||0)
      delete wo.Action.actionPool[action.hash]
    // }
  }
}

DAD._init=async function(){
  var signing=my.scheduleJobs[0]=Schedule.scheduleJob({ second:0 }, DAD.signOnce) // 每分钟的第0秒
  var electing=my.scheduleJobs[1]=Schedule.scheduleJob({second:20}, DAD.electOnce)
  var mining=my.scheduleJobs[2]=Schedule.scheduleJob({second:40}, DAD.mineOnce)
  var rule = new Schedule.RecurrenceRule();
  rule.second=[]
  for(let i =0;i<=39;i++) rule.second.push(i)
  my.scheduleJobs[3]=Schedule.scheduleJob(rule, DAD.actionLoop)
}

DAD.forkHandler  = async function(option){
  if(wo.Chain.getTopBlock().height!==Date.time2height()-1)
    return "高度未达到分叉标准"
  let res = await wo.Peer.broadcast('/Consensus/getRBS', {target:option.Block.packerPubkey})//取第一个元素
  res = res[0]
  if(res){
    let index = DAD.diffRecBlockStack(res)
    if(index===null||index===0)
    {
      mylog.warn('分叉长度超过当前可处理范围')
      return null
    }
    if(res[index].type==="VirtBlock" && my.recBlockStack[index].type!=="VirtBlock")
    {
      mylog.warn("对方的虚拟块应当被合并")
      return null
    }
    else if(res[index].type!=="VirtBlock" && my.recBlockStack[index].type==="VirtBlock")
    {
      res[index]=new wo['Block'](res[index])
      if(wo.Crypto.verify(res[index].winnerMessage,res[index].winnerSignature,res[index].winnerPubkey)
        &&res[index].verifySig()
        &&res[index].verifyHash()
      )
      {
        //说明自己分叉，去改数据库
        mylog.warn("我分叉了")
        my.scheduleJobs[0].cancel()
        my.scheduleJobs[1].cancel()
        my.scheduleJobs[2].cancel()
        let blockList = await wo.Block.getAll({Block:{height:'>'+(res[index].height-1)}, config:{limit:wo.Config.MaxRBS-index, order:'height ASC'}})
        for (let block of blockList){
          if(block.actionHashList.length !== 0 )
          {
            //获取本块所有交易
            let actionList = await wo.Action.getAll({Action:{blockHash:block.hash}, config:{limit:block.actionHashList.length}})
            for(let action of actionList)
            {
              if (action.validate()){
                wo.Action.api.prepare({Action:action}) // 将自己区块内的交易广播出去
              }
            }
          }  
          block.dropMe()
          my.recBlockStack.pop()
        }
        wo.Chain.pushTopBlock(res[index-1])
        await wo.Chain.updateChainFromPeer()
        await wo.Chain.verifyChainFromDb()
        my.bestPot={} // 全网最佳时间证明：{签名，时间申明，公钥}
        my.selfPot={} // 本节点最佳时间证明：{签名，时间申明，公钥}
        my.signBlock={} 
        my.scheduleJobs[0].reschedule({ second:0 }, DAD.signOnce)
        my.scheduleJobs[1].reschedule({ second:20 }, DAD.electOnce)
        my.scheduleJobs[2].reschedule({ second:40 }, DAD.mineOnce)
        // return 1
      }
      else
      mylog.warn("对方块非法")
    }
    /*
      POT的天然优势：
    */
    else
    {
      if(res[index].totalAmount*0.6+res[index].totalFee*0.4 < my.recBlockStack[index].totalAmount*0.6+my.recBlockStack[index].totalFee*0.4)
      {
        mylog.warn("我的更好 我没分叉")
        return null
      }
      else{
        if(res[index].totalAmount*0.6+res[index].totalFee*0.4 === my.recBlockStack[index].totalAmount*0.6+my.recBlockStack[index].totalFee*0.4)
        {
          if(res[index].totalAmount<my.recBlockStack[index].totalAmount)
            {
              mylog.warn("我的更好 我没分叉")
              return null
            }
        }
        mylog.warn("对方的更好 我应该被合并")
        my.scheduleJobs[0].cancel()
        my.scheduleJobs[1].cancel()
        my.scheduleJobs[2].cancel()
          let blockList = await wo.Block.getAll({Block:{height:'>'+(res[index].height-1)}, config:{limit:wo.Config.MaxRBS-index, order:'height ASC'}})
          for (let block of blockList){
            if(block.actionHashList.length !== 0 )
            {
              //获取本块所有交易
              let actionList = await wo.Action.getAll({Action:{blockHash:block.hash}, config:{limit:block.actionHashList.length}})
              for(let action of actionList)
              {
                if (action.validate()){
                  wo.Action.api.prepare({Action:action}) // 将自己区块内的交易广播出去
                }
              }
            }  
            block.dropMe()
            my.recBlockStack.pop()
          }
          wo.Chain.pushTopBlock(res[index-1])
          await wo.Chain.updateChainFromPeer()
          await wo.Chain.verifyChainFromDb()
          my.bestPot={} // 全网最佳时间证明：{签名，时间申明，公钥}
          my.selfPot={} // 本节点最佳时间证明：{签名，时间申明，公钥}
          my.signBlock={} 
          my.scheduleJobs[0].reschedule({ second:0 }, DAD.signOnce)
          my.scheduleJobs[1].reschedule({ second:20 }, DAD.electOnce)
          my.scheduleJobs[2].reschedule({ second:40 }, DAD.mineOnce)
      }
    } 
  }
  else
  mylog.warn("没拿到对方缓存表")
}

DAD.diffRecBlockStack = function(target){
  //target的类型也是列表
  for(index in target)
  {
    if(target[index].hash!==my.recBlockStack[index].hash
      &&target[index].height===my.recBlockStack[index].height
      &&target[index].lastBlockHash === my.recBlockStack[index].lastBlockHash
      ||target[index].winnerSignature !== my.recBlockStack[index].winnerSignature)
    {
      mylog.warn("差异处: %d", index)
      return index
    }
  }
  return null
}

DAD.pushInRBS = function(obj){
  if(my.recBlockStack.length < wo.Config.MaxRBS)
  {
    my.recBlockStack.push(obj)
  }
  else
  {
    my.recBlockStack.splice(0,1)
    my.recBlockStack.push(obj)
  }
}

DAD.api.getRBS = function(target){
  if(target.packerPubkey===wo.Config.packerPubkey){
    mylog.info("收到分享缓存区块请求")
    return my.recBlockStack
  }
} 
/********************** Private in class *********************/

const my={}
my.signerPool={} // use enduser pubkey as key, {signature, message} as value
my.packerPool={} // use fullnode pubkey as key, signBlock as value
my.bestPot={} // 全网最佳时间证明：{签名，时间申明，公钥}
my.selfPot={} // 本节点最佳时间证明：{签名，时间申明，公钥}
my.currentPhase
my.signBlock={} // 抽签块
my.recBlockStack=[]   //缓存最近的5个区块
my.scheduleJobs=[]

// set: 集合，可以是数组或者对象，复数。  blocks, actions, blockSet, actionSet
// set 分为 List 数组，Dict 对象