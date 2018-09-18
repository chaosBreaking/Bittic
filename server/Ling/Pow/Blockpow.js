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

var test = 6666;
MOM._tablekey='hash'
MOM._model={ // 数据模型，用来初始化每个对象的数据
  hash:           { default:undefined, sqlite:'TEXT',     mysql:'VARCHAR(64) PRIMARY KEY' }, 
  version:        { default:0,         sqlite:'INTEGER',  mysql:'INT' }, // 用来升级
  type:           { default:'',        sqlite:'TEXT',     mysql:'VARCHAR(100)'}, // 用来分类：普通块，虚拟块（如果某获胜节点没有及时出块，就用虚块填充）
  timestamp:      { default:undefined, sqlite:'INTEGER',  mysql:'INT' }, 
  height:         { default:undefined, sqlite:'INTEGER UNIQUE',  mysql:'BIGINT' }, 
  lastBlockHash:  { default:null,      sqlite:'TEXT',     mysql:'VARCHAR(64)' }, 
  numberAction:   { default:0,         sqlite:'INTEGER',  mysql:'INT' }, 
  totalAmount:    { default:0,         sqlite:'NUMERIC',  mysql:'BIGINT' }, 
  totalFee:       { default:0,         sqlite:'NUMERIC',  mysql:'BIGINT' }, 
  rewardWinner:   { default:0,         sqlite:'NUMERIC',  mysql:'BIGINT' },
  rewardPacker:   { default:0,         sqlite:'NUMERIC' },
  actionHashRoot: { default:undefined, sqlite:'TEXT',     mysql:'BINARY(32)' }, // 虽然已经存了actionHashList，但存一个梅克根有助于轻钱包。
  //packerPubkey:   { default:undefined, sqlite:'TEXT',     mysql:'BINARY(32)' }, 
  //packerSignature:{ default:undefined, sqlite:'TEXT',     mysql:'BINARY(64)' },
  //winnerPubkey:   { default:'',        sqlite:'TEXT' }, // 签名获胜者
  //winnerMessage:  { default:'',        sqlite:'TEXT' },
  //winnerSignature:{ default:'',        sqlite:'TEXT' },
  message:        { default:'',        sqlite:'TEXT',     mysql:'VARCHAR(256)' },
  actionHashList: { default:[],        sqlite:'TEXT' }, // 要不要在Block里记录每个事务？还是让每个事务自己记录所属Block？
  difficult:      { default:0,         sqlite:'NUMERIC'}, 
  nonce:          { default:0,         sqlite:'NUMERIC'},
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
  if(this.height == 10){
    this.reward = 8880000;
  }
  this.totalFee = 0
  this.totalAmount = 0
  this.version = 0
  this.timestamp = lastBlock?new Date():wo.Config.GENESIS_EPOCHE
  this.lastBlockHash = lastBlock?lastBlock.hash:null
  this.packerPubkey = keypair.pubkey

  let actionList=[]  // 被打包的事务（不一定整个actionPool都会被打包）
  let actionValues=Object.values(actionPool)
  while (action=actionValues.shift()) { // 遍历所有事务，累计哈希和总金额、总手续费等。
    if (await action.execute()){ // save changes of this action to other tables such as account
      actionList.push(action) // 后面还需要修改每个action的blockHash，存入数据库，所以这里要先保存在一个数组里
      this.actionHashList.push(action.hash)

      this.totalFee += (action.fee||0)

      delete actionPool[action.hash]
    }else{ // 也许事务无法执行（balance不够等等）
      continue
    }
  }
  this.actionHashRoot = wo.Crypto.getMerkleRoot(this.actionHashList)
  this.numberAction = this.actionHashList.length

  this.signMe(keypair.seckey)
//  this.normalize()

  this.hashMe()

  for (var action of actionList) {
    action.blockHash=this.hash
    action.addMe()
  }

  console.log('packed block '+this.height+' with '+this.numberAction+' actions')

  return this
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
    return true
  let actionList = await wo.Action.getAll({Action:{blockHash:this.hash}, config:{limit:this.actionHashList.length}})
  let actionHashList = wo.Tool.extend([], this.actionHashList)
  for (let action of actionList){
    if(actionHashList.indexOf(action.blockHash) !== -1)
    {
      actionHashList.splice(actionHashList.indexOf(action.blockHash), 1);
    }
    else  //没找到
    {
      console.log("丢弃一个错误Action")
      await action.dropMe()
    }
  }
  if(actionHashList.length === 0 )
    return true
  //丢失一些Action 开始向外同步
  let actionHash = null
  while (actionHashList.length > 0){
    actionHash = actionHashList.pop()
    for(let count = 0; count<10; count++){
      var missAction = await wo.Peer.randomcast('/Action/getAction', { Action:{ hash:actionHash } })
      if(missAction){
        await wo.Action.addOne({Action:missAction})
      }
      if(count >= 9 && !missAction)
      {
        return false
      }
    }
    //循环结束 还未拿到action 认为该区块不合法
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

const my={
  milestones: [
    { rewardWinner:60, rewardPacker:6,   penaltyPacker: -600, start:1 }, // 第一年，1分钟一块
    { rewardWinner:30, rewardPacker:3,   penaltyPacker: -300, start:60*24*365 }, // 第二年，30秒一块
    { rewardWinner:15, rewardPacker:1.5, penaltyPacker: -150, start:(1+2)*60*24*365 }, // 第三年，15秒一块
    { rewardWinner:10, rewardPacker:1,   penaltyPacker: -100, start:(1+2+4)*60*24*365 }, // 第四年，10秒一块
    { rewardWinner:5,  rewardPacker:0.5, penaltyPacker: -50,  start:(1+2+4+6)*60*24*365 }  // 第五年起，5秒一块
  ]
}
