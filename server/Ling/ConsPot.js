// 共识模块

const Schedule=require('node-schedule')

/******************** Public of instances ********************/

const DAD=module.exports=function ConsPot(prop) {
  this._class=this.constructor.name
//  this.setProp(prop)
}
//DAD.__proto__=Ling
const MOM = DAD.prototype
//MOM.__proto__=Ling.prototype

/******************** Shared by instances ********************/

/*********************** Public of class *********************/

DAD.api={}

// 第一阶段：签名
DAD.signOnce=async function(){
  //  todo: 检查高度是否正确，如果不正确，把my.signBlock添加进去
  let heightNow = Date.time2height()
  mylog.info(`此刻时间对应的区块高度 : ${heightNow}`)
  mylog.info('此刻本机链的最高块 : ' + wo.Chain.getTopBlock().height)
  if (heightNow === wo.Chain.getTopBlock().height + 2 && my.signBlock && wo.Chain.getTopBlock().height === my.signBlock.height - 1) { 
    // 上一块没有及时出现
    let result = await wo.Peer.randomcast('/Block/getBlock', { Block:{height : wo.Chain.getTopBlock().height + 1} })
    if(result && result.height ===  wo.Chain.getTopBlock().height+1)
    {
      let topBlock = new wo['Block'](result)
      await wo.Chain.appendBlock(topBlock)
    }
    if(!result || heightNow === wo.Chain.getTopBlock().height + 2)
    {
      mylog.info('上轮获胜节点错过出块！使用空块')
      await wo.Chain.appendBlock(my.signBlock)
      my.signBlock = null
    }
  }
  else if (heightNow > wo.Chain.getTopBlock().height + 1) {
    mylog.info('heightNow = ' + heightNow +' 当前本机链的最高块 = ' + wo.Chain.getTopBlock().height+'...准备更新缺少的区块')
    await wo.Chain.updateChainFromPeer()
  }  
  heightNow = Date.time2height()
  if (heightNow === wo.Chain.getTopBlock().height+1 && new Date().getSeconds()<15 ) { // 注意，前面的同步可能花了20多秒，到这里已经是在竞选阶段。所以再加个当前秒数的限制。
    mylog.info(new Date()+'：签名阶段开始 for block='+(wo.Chain.getTopBlock().height+1)+' using block='+wo.Chain.getTopBlock().height)
    mylog.info('重置sigPool/packerPool/selfPot/bestPot，来接收这一轮的签名。')
    my.signerPool={}
    my.packerPool={}
    my.selfPot={} // 注意，不要 my.selfPot=my.bestPot={} 这样指向了同一个对象！
    my.bestPot={} // 如果设signature=null，就可能会===compareSig返回的null，就产生错误了。因此保留为undefined.
    wo.Action.currentActionPool={}
    wo.Block.totalAmount = 0
    wo.Block.totalFee = 0
    mylog.info("合法事务池长度**********",Object.keys(wo.Action.currentActionPool).length)
    mylog.info("待办事务池长度**********",Object.keys(wo.Action.actionPool).length)
    // 作为节点，把自己签名直接交给自己。这是因为，全网刚起步时，很可能还没有终端用户，这时需要节点进行签名。
    let myAddress = wo.Crypto.secword2address(wo.Config.ownerSecword)
    let me = await wo.Account.getOne({Account:{address: myAddress}})
    if (me && me.balance > wo.Config.PACKER_THRESHOLD){
      let message={ timestamp:new Date(), blockHash:wo.Chain.getTopBlock().hash, height:heightNow }
      let signature=wo.Crypto.sign(message, wo.Crypto.secword2keypair(wo.Config.ownerSecword).seckey)
      let pubkey=wo.Crypto.secword2keypair(wo.Config.ownerSecword).pubkey
      my.signerPool[pubkey]={ message:message, signature:signature }
      my.selfPot.signature=signature
      my.selfPot.message=message
      my.selfPot.pubkey=pubkey
      mylog.info('本节点主人（地址'+myAddress+'）的时间证明签名：'+JSON.stringify(signature))
    }else{
      mylog.info('本节点主人（地址'+myAddress+'）的账户余额不足，无法参加本轮时间证明签名')
    }
    my.currentPhase='signing'
  }
}
DAD.api.signWatcher=async function(option) { // 监听收集终端用户的签名
  if (my.currentPhase!=='signing') {
    mylog.info('签名阶段尚未开始，忽略收到的时间证明：'+JSON.stringify(option))
  }
  else if (option && option.message && option.signature && option.pubkey && option.netType) {
    if(!my.signerPool.hasOwnProperty(option.pubkey) // 对一个用户，只采集其一个签名
        && wo.Crypto.verify(option.message, option.signature, option.pubkey) // 签名有效
        && Date.time2height(option.message.timestamp)===Date.time2height()
        && option.message.blockHash===wo.Chain.getTopBlock().hash
        && wo.Crypto.compareSig(wo.Chain.getTopBlock().hash, my.selfPot.signature, option.signature)!==my.selfPot.signature // 注意，my.selfPot.signature有可能是undefined
        && option.netType === wo.Config.netType // 前端应用的链，和后台节点的链相同
      ) { // 比我现有最好的更好
      var user = await wo.Account.getOne({Account:{address: wo.Crypto.pubkey2address(option.pubkey)}})
      if (user && user.balance>wo.Config.SIGNER_THRESHOLD) { // 只有账户里有币的用户才能挖矿。
        my.signerPool[option.pubkey]={message:option.message, signature:option.signature} 
        my.selfPot.signature = option.signature // 随时更新到最佳的签名
        my.selfPot.message=option.message
        my.selfPot.pubkey=option.pubkey
        mylog.info('终端用户（地址：'+wo.Crypto.pubkey2address(option.pubkey)+'）的时间证明验证成功、并且获胜：'+JSON.stringify(option.signature))
      }else{
        mylog.info('终端用户（地址：'+wo.Crypto.pubkey2address(option.pubkey)+'）的余额不足，时间证明不被接收，')
      }
    }
    else{
      mylog.info('终端用户（地址：'+wo.Crypto.pubkey2address(option.pubkey)+'）的签名 '+option.signature+' 没有通过本节点验证或竞争')
    }
  }
  else{
    mylog.info('收到无效的时间证明：'+JSON.stringify(option))
  }
  return null
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
      my.bestPot.signature = my.selfPot.signature // 把本节点收到的用户最佳签名，暂时记为全网最佳。
      my.bestPot.message = my.selfPot.message
      my.bestPot.pubkey = my.selfPot.pubkey
      my.signBlock = new wo.Block({winnerMessage:my.selfPot.message, winnerSignature:my.selfPot.signature, winnerPubkey:my.selfPot.pubkey, type:'SignBlock'}) // 把候选签名打包进本节点的虚拟块
      await my.signBlock.packMe([], wo.Chain.getTopBlock(), wo.Crypto.secword2keypair(wo.Config.ownerSecword))
      mylog.info('广播本节点的赢家的预签名空块：'+my.signBlock.hash)
      wo.Peer.broadcast('/Consensus/electWatcher', {Block:JSON.stringify(my.signBlock)})
    }
    else{
      mylog.info('本节点没有收集到时间证明，本轮不参与竞选')
    }
  }
  else{
    mylog.info('本节点的最高块高度为'+wo.Chain.getTopBlock().height+', 不匹配当前时刻所属块的高度'+Date.time2height()+'，不参与本轮竞选')
  }
}
DAD.api.electWatcher=async function(option) { // 互相转发最优的签名块
  if (my.currentPhase!=='electing') {
    mylog.info('竞选阶段尚未开始，忽略收到的预签名空块：'+JSON.stringify(option.Block))
    return null
  }
  if (option && option.Block 
      && (!my.signBlock || option.Block.hash !== my.signBlock.hash) // 收到的区块不是本节点目前已知的最优块
      && option.Block.winnerSignature!==my.bestPot.signature // 不要重复接收同一个最佳块
      && !my.packerPool.hasOwnProperty(option.Block.packerPubkey) // 一个packer只允许出一个签
      && option.Block.packerPubkey!==wo.Crypto.secword2keypair(wo.Config.ownerSecword).pubkey // 收到的区块不是本节点自己打包的
      && wo.Crypto.verify(option.Block.winnerMessage, option.Block.winnerSignature, option.Block.winnerPubkey)
      && option.Block.lastBlockHash === wo.Chain.getTopBlock().hash
      && wo.Block.verifySig(option.Block) &&  wo.Block.verifyHash(option.Block)
  ){
//    mylog.info('Received SignBlock: '+JSON.stringify(option.Block.winnerSignature)+', '+JSON.stringify(wo.Crypto.pubkey2address(option.Block.packerPubkey)))
    my.packerPool[option.Block.packerPubkey]=option.Block
    let user=await wo.Account.getOne({Account:{address: wo.Crypto.pubkey2address(option.Block.winnerPubkey)}})
    let packer = await wo.Account.getOne({Account:{address: wo.Crypto.pubkey2address(option.Block.packerPubkey)}})
    if( option.Block.winnerSignature === wo.Crypto.compareSig(wo.Chain.getTopBlock().hash, my.bestPot.signature, option.Block.winnerSignature) // 新收到的签名获胜了。注意，my.bestPot.signature有可能是undefined
        && user 
        && user.balance > wo.Config.SIGNER_THRESHOLD 
        && packer.balance > wo.Config.PACKER_THRESHOLD
      ){
      mylog.info('新收到的预签名空块胜出：赢家签名='+option.Block.winnerSignature+'，地址='+wo.Crypto.pubkey2address(option.Block.winnerPubkey)+'，节点地址='+wo.Crypto.pubkey2address(option.Block.packerPubkey))
      my.bestPot.signature=option.Block.winnerSignature
      my.bestPot.pubkey=option.Block.winnerPubkey
      my.bestPot.message=option.Block.winnerMessage
      my.signBlock=option.Block // 保存新收到的签名块
      wo.Peer.broadcast('/Consensus/electWatcher', {Block:JSON.stringify(option.Block)}) // 就进行广播
      return my.signBlock
    }
    else{ // 对方的签名不如我的，就把我的最优签名告知它
      mylog.info('收到的预签名空块的用户'+wo.Crypto.pubkey2address(option.Block.winnerPubkey)+'或节点'+wo.Crypto.pubkey2address(option.Block.packerPubkey)+'的余额不足，或签名没有胜出：'+option.Block.winnerSignature)
      return my.signBlock
    }
  }
  else if (
    // option && option.Block && (!my.signBlock || option.Block.hash !== my.signBlock.hash)
      wo.Crypto.verify(option.Block.winnerMessage, option.Block.winnerSignature, option.Block.winnerPubkey)
      && option.Block.height !== wo.Chain.getTopBlock().height + 1
      && option.Block.lastBlockHash !== wo.Chain.getTopBlock().hash // 分叉了
      && wo.Block.verifySig(option.Block)
      && wo.Block.verifyHash(option.Block)
  ){
    mylog.info("收到分叉的预签名空块，来自用户："+wo.Crypto.pubkey2address(option.Block.winnerPubkey))
    mylog.info("收到分叉的预签名空块，来自节点："+wo.Crypto.pubkey2address(option.Block.packerPubkey))    
    mylog.info("本节点上一区块HASH: " + wo.Chain.getTopBlock().hash)
    mylog.info("分叉的预签名空块的上一区块哈希: " + option.Block.lastBlockHash)
    mylog.info("开始处理分叉.........")
    DAD.forkHandler(option)
  }
  else if( !wo.Block.verifySig(option.Block) || !wo.Block.verifyHash(option.Block))
  {
    mylog.info("收到无法通过签名或哈希验证的预签名空块：")
    mylog.info("来自用户："+wo.Crypto.pubkey2address(option.Block.winnerPubkey))
    mylog.info("来自节点："+wo.Crypto.pubkey2address(option.Block.packerPubkey))
    mylog.info("收到的预签名空块的上一区块哈希: " + option.Block.lastBlockHash)
    mylog.info("本节点上一区块HASH: " + wo.Chain.getTopBlock().hash)
  }
  else // 通常，假如本节点具有全网赢家，我发给别人后，别人会再发给我，就会走到这里来。
  {
    mylog.info('收到的签名块无效：'+JSON.stringify(option.Block.hash))
    // if (option.Block.packerPubkey===wo.Crypto.secword2keypair(wo.Config.ownerSecword).pubkey) 
    //   mylog.info('是本节点打包的')
    // if (my.packerPool.hasOwnProperty(option.Block.packerPubkey))
    //   mylog.info('该节点已经提交过区块')
    // if (option.Block.winnerSignature===my.bestPot.signature)
    //   mylog.info('重复接收该签名')
    // if (my.signBlock && option.Block.hash === my.signBlock.hash)
    //   mylog.info('已是本节点已知的最佳块')
  }
  return null
}
DAD.api.shareWinner=async function(option){
  // if (option.winnerSignature === my.bestPot.signature)
  return my.signBlock
}

// 第三阶段：出块，或接收获胜者打包广播的区块
DAD.mineOnce=async function(){
  if (Date.time2height()===wo.Chain.getTopBlock().height+1) {
    mylog.info(new Date()+'：出块阶段开始 for block='+(wo.Chain.getTopBlock().height+1)+' using block='+wo.Chain.getTopBlock().height)
    mylog.info('全网最终获胜签名='+my.bestPot.signature+'，来自地址地址 '+wo.Crypto.pubkey2address(my.bestPot.pubkey))
    mylog.info('本节点的候选签名='+my.selfPot.signature+'，来自地址地址 '+wo.Crypto.pubkey2address(my.selfPot.pubkey))
    my.currentPhase='mining'
    if (my.selfPot.signature && my.bestPot.signature === my.selfPot.signature) { // 全网最终获胜者是我自己，于是打包并广播。注意防止 bestPot===selfPot===undefined，这是跳过竞选阶段直接从前两阶段开始会发生的。
      mylog.info('本节点获胜，开始出块...')
      let block = await wo.Chain.createBlock({winnerMessage:my.selfPot.message,winnerSignature:my.selfPot.signature, winnerPubkey:my.selfPot.pubkey})
      wo.Peer.broadcast('/Consensus/mineWatcher', {Block:JSON.stringify(wo.Chain.getTopBlock())})
      mylog.info('本节点出块的哈希为：'+wo.Chain.getTopBlock().hash)
    }
    else{
      mylog.info('本节点没有赢:(')
    }
  }
  return 0
}

DAD.api.mineWatcher=async function(option){ // 监听别人发来的区块
  if (my.currentPhase!=='mining') {
    mylog.info('出块阶段尚未开始，忽略收到的区块：'+JSON.stringify(option.Block))
  }
  else if( option 
      && option.Block
      && option.Block.winnerSignature===my.bestPot.signature 
      && my.bestPot.signature!==my.selfPot.signature // 收到了全网赢家的区块，而全网赢家不是本节点的
      && option.Block.lastBlockHash===wo.Chain.getTopBlock().hash 
      && option.Block.height===wo.Chain.getTopBlock().height+1
    ){ 
      // 注意不要接受我自己作为获胜者创建的块，以及不要重复接受已同步的区块
    let block = await wo.Chain.appendBlock(option.Block)
    if (block){
      wo.Peer.broadcast('/Consensus/mineWatcher', {Block:JSON.stringify(wo.Chain.getTopBlock())})
      mylog.info('本节点收到全网赢家的区块哈希为：'+wo.Chain.getTopBlock().hash+'，全网赢家的地址为'+wo.Crypto.pubkey2address(option.Block.winnerPubkey)+'，打包节点的地址为 '+wo.Crypto.pubkey2address(option.Block.packerPubkey))
    }
    else{
      mylog.error(`添加高度在${option.Block.height}的区块失败!`)
    }
  }
  else {
    if (my.bestPot.signature!==my.selfPot.signature) // 全网赢家不是本节点的
      mylog.info('本节点刚收到的区块不是全网赢家的，而是'+wo.Crypto.pubkey2address(option.Block.winnerPubkey)+'的，打包节点的地址为 '+wo.Crypto.pubkey2address(option.Block.packerPubkey))
  }
  return 0
}

DAD.actionLoop = function(){
  //事务处理循环：拿出actionPool里的事务--->执行并放入currentActionPool--->从删除actionPool删除
  //出块时调用的是 currentActionPool
  while(my.currentPhase!=='mining' && Object.keys(wo.Action.actionPool).length>0){
      action = Object.values(wo.Action.actionPool).shift()
      // if(!action) return 0
      wo.Action.currentActionPool[action.hash] = action
      wo.Block.totalAmount += action.amount||0
      wo.Block.totalFee +=  action.fee||0
      delete wo.Action.actionPool[action.hash]
  }
}

DAD._init = function(){
  var signing=my.scheduleJobs[0]=Schedule.scheduleJob({ second:0 }, DAD.signOnce) // 每分钟的第0秒
  var electing=my.scheduleJobs[1]=Schedule.scheduleJob({second:20}, DAD.electOnce)
  var mining=my.scheduleJobs[2]=Schedule.scheduleJob({second:40}, DAD.mineOnce)
  if(new Date().getSeconds()<15) DAD.signOnce()
  var rule = new Schedule.RecurrenceRule();
  rule.second=[]
  for(let i =0;i<=39;i++) rule.second.push(i)
  my.scheduleJobs[3]=Schedule.scheduleJob(rule, DAD.actionLoop)
}

DAD.forkHandler  = async function(option){
  if(wo.Chain.getTopBlock().height <= Date.time2height() - 2)
    return "高度未达到分叉标准"
  let res = await wo.Peer.broadcast('/Consensus/getRBS', {target:option.Block.packerPubkey})//取第一个元素
  if(!res){
    mylog.warn("没拿到对方缓存表")
    return null
  }
    // res = res[0]
  let diff = DAD.diffRecBlockStack(my.recBlockStack , res)
  if(typeof diff.index === 'undefined' || diff.index === 0)
  {
    mylog.warn('分叉长度超过可处理范围')
    return null
  }
  if(res[diff.index].height === my.recBlockStack[diff.index].type && res[diff.index].height === "VirtBlock" && my.recBlockStack[diff.index].type !== "VirtBlock")
  {
    mylog.warn("对方的虚拟块应当被合并")
    return null
  }
  //区块合法性检验
  let forkBlock = new wo.Block(my.recBlockStack[diff.index])
  if( !wo.Crypto.verify(forkBlock.winnerMessage, forkBlock.winnerSignature, forkBlock.winnerPubkey)
      || !forkBlock.verifySig()
      || !forkBlock.verifyHash()
  ){
    mylog.warn("收到非合法的区块,分叉合并取消")
    return null
  }
  //检验通过
  else if( res[index].totalAmount < my.recBlockStack[index].totalAmount || res[index].totalFee < my.recBlockStack[index].totalFee)
  {
    mylog.warn("本节点区块交易量或手续费更多，保持本机区块数据，取消合并")
    return null
  } 
  //剩下的情况本机需要被合并   
  else{
    //说明自己分叉，开始处理分叉
    mylog.warn(`本节点在高度${diff.height}分叉,开始处理分叉...`)
    my.scheduleJobs[0].cancel()
    my.scheduleJobs[1].cancel()
    my.scheduleJobs[2].cancel()
    let blockList = await wo.Block.getAll({Block:{height:'>'+( diff.height - 1)}, config:{limit:10, order:'height ASC'}})
    for (let block of blockList){
      if(block.actionHashList.length !== 0 )
      {
        //获取本块所有交易
        let actionList = await wo.Action.getAll({Action:{blockHash:block.hash}, config:{limit:block.actionHashList.length}})
        for(let action of actionList)
        {
            wo.Peer.broadcast('/Action/prepare', option) // 将自己区块内的交易广播出去
        }
      }  
      await block.dropMe()
    }
    my.recBlockStack.splice(diff.index) //删除recBlockStack里从分叉点开始以后的全部块记录
    wo.Chain.pushTopBlock(my.recBlockStack[diff.index-1]) //记录top区块
    await wo.Chain.updateChainFromPeer()
    await wo.Chain.verifyChainFromDb()
    my.bestPot={} // 全网最佳时间证明：{签名，时间申明，公钥}
    my.selfPot={} // 本节点最佳时间证明：{签名，时间申明，公钥}
    my.signBlock={} 
    my.scheduleJobs[0].reschedule({ second:0 }, DAD.signOnce)
    my.scheduleJobs[1].reschedule({ second:20 }, DAD.electOnce)
    my.scheduleJobs[2].reschedule({ second:40 }, DAD.mineOnce)
    return 0 
  }

}

DAD.diffRecBlockStack = function(mine,target){
  //target的类型也是列表
  for(index in target)
  {
    if(target[index].hash !== mine[index].hash
      &&target[index].height === mine[index].height
      &&target[index].lastBlockHash === mine[index].lastBlockHash
      ||target[index].winnerSignature !== mine[index].winnerSignature)
    {
      mylog.warn(`差异高度${target[index].height}`)
      return {index, height:target[index].height}
    }
  }
  return null
}

DAD.pushInRBS = function(obj){
  // MaxRBS = 10
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