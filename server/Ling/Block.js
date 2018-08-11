var Ling = wo.Ling

/******************** Public members of instance ********************/

const DAD=module.exports=function Block(prop) { // 构建类
  this._class=this.constructor.name
  this.setProp(prop)
}
DAD.__proto__=Ling
DAD._table=DAD.name
const MOM=DAD.prototype // 原型对象
MOM.__proto__=Ling.prototype

/******************** Public members shared by instances ********************/
MOM._tablekey='hash'
MOM._model={ // 数据模型，用来初始化每个对象的数据
  hash:           { default:undefined, sqlite:'TEXT',     mysql:'VARCHAR(64) PRIMARY KEY' }, 
  version:        { default:0,         sqlite:'INTEGER',  mysql:'INT' }, // 用来升级
  type:           { default:'',        sqlite:'TEXT',     mysql:'VARCHAR(100)'}, // 用来分类：普通块，虚拟块（如果某获胜节点没有及时出块，就用虚块填充）
  timestamp:      { default:undefined, sqlite:'TEXT',  mysql:'CHAR(24)' }, 
  height:         { default:undefined, sqlite:'INTEGER UNIQUE',  mysql:'BIGINT' }, 
  lastBlockHash:  { default:null,      sqlite:'TEXT',     mysql:'VARCHAR(64)' }, 
  numberAction:   { default:0,         sqlite:'INTEGER',  mysql:'INT' }, 
  totalAmount:    { default:0,         sqlite:'NUMERIC',  mysql:'BIGINT' }, 
  totalFee:       { default:0,         sqlite:'NUMERIC',  mysql:'BIGINT' }, 
  rewardWinner:   { default:0,         sqlite:'NUMERIC',  mysql:'BIGINT' },
  rewardPacker:   { default:0,         sqlite:'NUMERIC' },
  packerPubkey:   { default:undefined, sqlite:'TEXT',     mysql:'BINARY(32)' }, 
  packerSignature:{ default:undefined, sqlite:'TEXT',     mysql:'BINARY(64)' },
  winnerPubkey:   { default:'',        sqlite:'TEXT' }, // 抽签获胜者
  winnerMessage:  { default:'',        sqlite:'TEXT' },
  winnerSignature:{ default:'',        sqlite:'TEXT' },
  actionHashRoot: { default:undefined, sqlite:'TEXT',     mysql:'BINARY(32)' }, // 虽然已经存了actionHashList，但存一个梅克根有助于轻钱包。
  actionHashList: { default:[],        sqlite:'TEXT' }, // 要不要在Block里记录每个事务？还是让每个事务自己记录所属Block？
  message:        { default:'',        sqlite:'TEXT',     mysql:'VARCHAR(256)' },
  json:           { default:{},        sqlite:'TEXT' } // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
}

MOM.getReward= function (option) {
  option=option||{}
  var height=option.height||this.height||1
  var rewardType=option.rewardType||'rewardWinner'
  let reward=0
  if (height>0){
    for (let milestone of my.milestones){
      if (height>=milestone.start)
        reward=milestone[rewardType]
      else
        break
    }
  }
  return reward
}
MOM.getSupply= function (height) { // 计算当前流通总数：预发行数+挖出数
  height=height||this.height||1
  let supply = wo.Config.COIN_INIT_AMOUNT // 创世块中预发行的数量
  if (height>0){
    for (let i=0; i< my.milestones.length; i++){
      if (height >= my.milestones[i+1].start){
        supply += my.milestones[i].reward * (my.milestones[i+1].start - my.milestones[i].start)
      }else{
        supply += my.milestones[i].reward * (height - my.milestones[i].start)
      }
    }
  }
  return supply
}

MOM.packMe = async function (actionPool, lastBlock, keypair) { // 后台节点挖矿者的公私钥
  this.height = lastBlock ? lastBlock.height + 1 : wo.Config.GENESIS_HEIGHT
  this.rewardWinner = this.getReward({rewardType:'rewardWinner'})
  this.rewardPacker = this.getReward({rewardType:'rewardPacker'})
  this.totalFee = 0
  this.totalAmount = 0
  this.version = 0
  this.timestamp = lastBlock?new Date():wo.Config.GENESIS_EPOCHE
  this.lastBlockHash = lastBlock?lastBlock.hash:null
  this.packerPubkey = keypair.pubkey

  let actionValues=Object.values(actionPool||{})  //todo：依照手续费对交易进行排序

  /*  此注释以下内容不应该放在Block内，而是应该从事务池中直接取出一个 合法的事务集合
      假如我们限定一个区块内所能容纳的事务上限为N,则
      packMe函数应该接受的参数是(currentActionPool,merkelRoot=null,lastBlock,keypair)
        ·validAction为Action的静态属性,存储从actionPool中拿出的N个合法的action
        ·merkelRoot也可以在block中算出来,也可以Action算出来后直接传入
      总之，出块的时候，对于Action只需要确定：
      1. 所有合法且应该被包含于当前Block的actionHash
      2. merkelRoot
   */

  // while (action=actionValues.shift()) { // 遍历所有事务，累计哈希和总金额、总手续费等。
  //   if (await action.execute()){ // save changes of this action to other tables such as account
  //     actionList.push(action) // 后面还需要修改每个action的blockHash，存入数据库，所以这里要先保存在一个数组里
  //     this.actionHashList.push(action.hash)

  //     this.totalFee += (action.fee||0)

  //     this.totalAmount += (action.amount||0)
      
  //     delete actionPool[action.hash]
  //   }else{ // 也许事务无法执行（balance不够等等）
  //     continue
  //   }
    if(this.type!=="SignBlock")
    {

      this.totalAmount = DAD.totalAmount
      this.totalFee = DAD.totalFee
      DAD.totalAmount = DAD.totalFee = 0
      this.actionHashList = Object.keys(actionPool||{})

      this.actionHashRoot = wo.Crypto.getMerkleRoot(this.actionHashList)
      this.numberAction = this.actionHashList.length
      DAD.todoActionPool = actionPool
    }
  
  this.signMe(keypair.seckey)

  //  this.normalize()

  this.hashMe()
  if(this.type!=="SignBlock")
  mylog.info('block '+this.height+' is created with '+this.numberAction+' actions')

  return this

}
MOM.runActionList = async function()
{
  // let actionHashList = DAD.todoActionPool
  if(this.actionHashList.length){
    actionList = Object.values(wo.Consensus.currentActionPool||wo.Action.actionPool)
    for (var action of actionList) {
      action.blockHash=this.hash
      await action.execute()
      await action.addMe()  //这里要用await 不然在循环中会因为多次add触发数据库死锁 ResourceRequest
      // delete wo.Action.verifyActionList[action.hash]
    }
    mylog.info("共action--"+Object.keys(wo.Consensus.currentActionPool||wo.Action.actionPool).length+" Action写入数据库")
  }
  else
  {
    return null
  }
}
MOM.hashMe = function(){
  this.hash=wo.Crypto.hash(this.getJson({exclude:['hash']}))
  return this
}
MOM.verifyHash=function(){
  if (this.type==='VirtBlock') return true
  return this.hash===wo.Crypto.hash(this.getJson({exclude:['hash']}))
}
DAD.verifyHash = function(blockData){
  let block = new DAD(blockData)
  return block.verifyHash()
}
MOM.signMe = function(seckey){ // 全节点对自己生成的区块签字
  let json=this.getJson({exclude:['hash','packerSignature']})
  this.packerSignature=wo.Crypto.sign(json, seckey)
  return this
}
MOM.verifySig = function () { // 验证其他节点发来的block
  if (this.type==='VirtBlock') return true
  let json=this.getJson({exclude:['hash','packerSignature']})
  let res=wo.Crypto.verify(json, this.packerSignature, this.packerPubkey)
  // 要不要继续验证actionList？
  return res
}
DAD.verifySig = function(blockData){
  let block=new DAD(blockData)
  return block.verifySig()
}

MOM.verifyActionList = async function(){
  if(this.actionHashList.length === 0 )
  {
    if(this.type!=="VirtBlock" && this.packerPubkey && this.winnerPubkey!==""){
      let winnerAccount = await wo.Account.getOne({Account:{address:wo.Crypto.pubkey2address(this.winnerPubkey)}})
      if (winnerAccount) await winnerAccount.setMe({Account:{balance:winnerAccount.balance+this.rewardWinner},cond:{address:winnerAccount.address},excludeSelf:true})
      let packerAccount = await wo.Account.getOne({Account:{address:wo.Crypto.pubkey2address(this.packerPubkey)}})
      if (packerAccount) await packerAccount.setMe({Account:{balance:packerAccount.balance+this.rewardPacker},cond:{address:packerAccount.address},excludeSelf:true})    
        return true;
    }
    else if(this.type==="SignBlock")
    {
      this.rewardPacker = this.getReward({rewardType:'packerPenalty'})
      let winnerAccount = await wo.Account.getOne({Account:{address:wo.Crypto.pubkey2address(block.winnerPubkey)}})
      if (winnerAccount) await winnerAccount.setMe({Account:{balance:winnerAccount.balance+block.rewardWinner},cond:{address:winnerAccount.address},excludeSelf:true})
      let packerAccount = await wo.Account.getOne({Account:{address:wo.Crypto.pubkey2address(block.packerPubkey)}})
      if (packerAccount) await packerAccount.setMe({Account:{balance:packerAccount.balance+block.rewardPacker},cond:{address:packerAccount.address},excludeSelf:true})              
      return true;
    }
    return true
  }
  let actionList = await wo.Action.getAll({Action:{blockHash:this.hash}, config:{limit:this.actionHashList.length}})
  let actionHashList = wo.Tool.extend([], this.actionHashList)
  for (let action of actionList){
    if(actionHashList.indexOf(action.hash) !== -1)
    {
      let tar = new wo[action.type](action)
      await tar.execute()  //每次重启Account被清空，所以要在这里重建
      actionHashList.splice(actionHashList.indexOf(action.hash), 1);
    }
    else  //没找到
    {
      mylog.info("丢弃一个错误Action")
      await action.dropMe()
    }
  }
  if(actionHashList.length === 0 )  //双向检查完毕，执行区块奖励操作后返回
  {
    if(this.type!=="VirtBlock" && this.packerPubkey && this.winnerPubkey!==""){
      let winnerAccount = await wo.Account.getOne({Account:{address:wo.Crypto.pubkey2address(this.winnerPubkey)}})
      if (winnerAccount) await winnerAccount.setMe({Account:{balance:winnerAccount.balance+this.rewardWinner},cond:{address:winnerAccount.address},excludeSelf:true})
      let packerAccount = await wo.Account.getOne({Account:{address:wo.Crypto.pubkey2address(this.packerPubkey)}})
      if (packerAccount) await packerAccount.setMe({Account:{balance:packerAccount.balance+this.rewardPacker},cond:{address:packerAccount.address},excludeSelf:true})    
        return true;
    }
    else if(this.type==="SignBlock")
    {
      this.rewardPacker = this.getReward({rewardType:'packerPenalty'})
      let winnerAccount = await wo.Account.getOne({Account:{address:wo.Crypto.pubkey2address(block.winnerPubkey)}})
      if (winnerAccount) await winnerAccount.setMe({Account:{balance:winnerAccount.balance+block.rewardWinner},cond:{address:winnerAccount.address},excludeSelf:true})
      let packerAccount = await wo.Account.getOne({Account:{address:wo.Crypto.pubkey2address(block.packerPubkey)}})
      if (packerAccount) await packerAccount.setMe({Account:{balance:packerAccount.balance+block.rewardPacker},cond:{address:packerAccount.address},excludeSelf:true})              
      return true;
    }

    return true
  }
  //丢失一些Action 开始向外同步
  let actionHash = null
  while (actionHashList.length > 0){
    actionHash = actionHashList.pop()
    for(let count = 0; count<10; count++){
      var missAction = await wo.Peer.randomcast('/Action/getAction', { Action:{ hash:actionHash } })
      if(missAction){
        var target=new wo[missAction.type](missAction)
        if (target.validate()){
          await target.execute()    //执行该Action
          await target.addMe()      //加入Action表
        }
        break
      }
      else if(count > 9 && !missAction)
      {
        return false
      }
      //循环结束 还未拿到action 认为该区块不合法
    }
  }
  if(this.type!=="VirtBlock" && this.packerPubkey && this.winnerPubkey!==""){
    let winnerAccount = await wo.Account.getOne({Account:{address:wo.Crypto.pubkey2address(this.winnerPubkey)}})
    if (winnerAccount) await winnerAccount.setMe({Account:{balance:winnerAccount.balance+this.rewardWinner},cond:{address:winnerAccount.address},excludeSelf:true})
    let packerAccount = await wo.Account.getOne({Account:{address:wo.Crypto.pubkey2address(this.packerPubkey)}})
    if (packerAccount) await packerAccount.setMe({Account:{balance:packerAccount.balance+this.rewardPacker},cond:{address:packerAccount.address},excludeSelf:true})    
      return true;
  }
  else if(this.type==="SignBlock")
  {
    this.rewardPacker = this.getReward({rewardType:'packerPenalty'})
    let winnerAccount = await wo.Account.getOne({Account:{address:wo.Crypto.pubkey2address(block.winnerPubkey)}})
    if (winnerAccount) await winnerAccount.setMe({Account:{balance:winnerAccount.balance+block.rewardWinner},cond:{address:winnerAccount.address},excludeSelf:true})
    let packerAccount = await wo.Account.getOne({Account:{address:wo.Crypto.pubkey2address(block.packerPubkey)}})
    if (packerAccount) await packerAccount.setMe({Account:{balance:packerAccount.balance+block.rewardPacker},cond:{address:packerAccount.address},excludeSelf:true})              
    return true;
  }
  return true
}

MOM.normalize=function(){
  for (let action of this.actionHashList) {
//    action.normalize();
  }
  return this
}

/*********************** Public members of class *******************/

DAD.api={} // 面向前端应用的API

DAD.api.getBlockList=async function(option){
  return await DAD.getAll(option)
}

DAD.api.getBlock=async function(option){
  return await DAD.getOne(option)
}

DAD.api.getActionList=async function(option) {
  if (option && option.Block && option.Block.hash && option.Block.height) {
    var block=await DAD.getOne(option)
    if (block && Array.isArray(block.actionHashList) && block.actionHashList.length>0) {
      var actionList = []
      for (var actionHash of block.actionHashList) {
        var action=await wo.Action.getOne({Action:{hash: actionHash}})
        if (action) actionList.push(action)
      }
      return actionList
    }
  }
  return null
}

/********************** Private members in class *******************/
DAD.todoActionPool={}
DAD.totalFee=0
DAD.totalAmount=0
const my={
  milestones: [
    { rewardWinner:60, rewardPacker:6,   penaltyPacker: -600, start:1 }, // 第一年，1分钟一块
    { rewardWinner:30, rewardPacker:3,   penaltyPacker: -300, start:60*24*365 }, // 第二年，30秒一块
    { rewardWinner:15, rewardPacker:1.5, penaltyPacker: -150, start:(1+2)*60*24*365 }, // 第三年，15秒一块
    { rewardWinner:10, rewardPacker:1,   penaltyPacker: -100, start:(1+2+4)*60*24*365 }, // 第四年，10秒一块
    { rewardWinner:5,  rewardPacker:0.5, penaltyPacker: -50,  start:(1+2+4+6)*60*24*365 }  // 第五年起，5秒一块
  ]
}
