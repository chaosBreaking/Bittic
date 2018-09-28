var Ling = wo.Ling

/******************** Public of instance ********************/

const DAD=module.exports=function Action(prop) {
  this._class=this.constructor.name
  this.setProp(prop)
}
DAD.__proto__=Ling
DAD._table=DAD.name
const MOM=DAD.prototype
MOM.__proto__=Ling.prototype

/******************** Shared by instances ********************/
MOM._tablekey='hash'
MOM._model= {
  hash:           { default:undefined, sqlite:'TEXT UNIQUE',     mysql:'VARCHAR(64) PRIMARY KEY' }, // 不纳入签名和哈希
  version:        { default:0,         sqlite:'INTEGER' },
  type:           { default:'Action',  sqlite:'TEXT',     mysql:'VARCHAR(100)' }, // 是否放在 assets里更好？这里该放action自己的version
  blockHash:      { default:undefined, sqlite:'TEXT',     mysql:'VARCHAR(64)' }, // 不纳入签名和哈希。只为了方便查找
  timestamp:      { default:undefined, sqlite:'TEXT',  mysql:'CHAR(24)' },
  actorPubkey:    { default:undefined, sqlite:'TEXT',     mysql:'BINARY(32)' },
  actorAddress:   { default:undefined, sqlite:'TEXT',     mysql:'VARCHAR(50)' },
  actorSignature: { default:undefined, sqlite:'TEXT',     mysql:'BINARY(64)' }, // 不纳入签名，纳入哈希
  toAddress:      { default:undefined, sqlite:'TEXT',     mysql:'VARCHAR(50)' },
  amount:         { default:0,         sqlite:'NUMERIC',  mysql:'BIGINT' },
  fee:            { default:0,         sqlite:'NUMERIC',  mysql:'BIGINT' },
  message:        { default:undefined, sqlite:'TEXT',     mysql:'VARCHAR(256)' },
  dataIndex:      { default:undefined, sqlite:'TEXT',     mysql:'VARCHAR(50)'}, //用于索引json中存储数据，
  method:         { default:undefined, sqlite:'TEXT' }
}

MOM.packMe = function(keypair){ // 由前端调用，后台不创建
  this.actorPubkey=keypair.pubkey
  this.actorAddress=wo.Crypto.pubkey2address(keypair.pubkey)
  this.timestamp=new Date()
  
  this.signMe(keypair.seckey)
  this.hashMe()
  return this
}

MOM.signMe = function(seckey){ // 由前端调用，后台不该进行签名
  let json=this.getJson({exclude:['hash','blockHash','actorSignature']}) // 是前端用户发起事务时签字，这时候还不知道进入哪个区块，所以不能计入blockHash
  this.actorSignature=wo.Crypto.sign(json, seckey)
  return this
}

MOM.hashMe = function(){
  this.hash=wo.Crypto.hash(this.getJson({exclude:['hash', 'blockHash']})) // block.hash 受到所包含的actionList影响，所以action不能受blockHash影响，否则循环了
  return this
}

DAD.verifySig = function(){
  let json=this.getJson({exclude:['hash','blockHash','actorSignature']})
  let res=wo.Crypto.verify(json, this.actorSignature, this.actorPubkey)
  return res
}

DAD.verifyAddress = function(){
  return this.actorAddress===wo.Crypto.pubkey2address(this.actorPubkey)
}

DAD.verifyHash = function(){
  return this.hash===wo.Crypto.hash(this.getJson({exclude:['hash', 'blockHash']}))
}

DAD.execute=function(){ // 子类应当覆盖本方法。把action的影响，汇总登记到其他表格（用于辅助的、索引的表格），方便快速索引、处理。每种事务类型都要重定义这个方法。
  // save to account or other tables
  return this
}

DAD.calculateFee = function(){
  return 1000
}

// DAD._init=async function(){
//   await DAD.__proto__._init() // create database table at first
//   await DAD.actionLoop() 
//   return this
// }

/*********************** Public of class *******************/
DAD.api={}

DAD.api.getAction=async function(option){
  return await DAD.getOne(option)
}

DAD.api.getActionList=async function(option){
  return await DAD.getAll(option)
}

DAD.api.prepare=async function(option){ 
  // 前端发来action数据，进行初步检查（不检查是否可执行--这和事务类型、执行顺序有关，只检查格式是否有效--这是所有事务通用的规范）后放入缓冲池。
  if (option && option.Action && option.Action.type && option.Action.hash && !DAD.actionPool[option.Action.hash]) {
    if( DAD.verifyAddress(option.action) && 
        DAD.verifySig(option.action) && 
        DAD.verifyHash(option.action) &&
        wo[option.Action.type].validater(option.action)) 
    {
      // mylog.info('Received action='+JSON.stringify(action))
      DAD.actionPool[action.hash] = option.action
      wo.Peer.broadcast('/Action/prepare', option)
      return option.action
    }
  }
  return null  // 非法的交易数据
}

/********************** Private in class *******************/

DAD.actionPool = {} // 随时不断接收新的交易请求
DAD.currentActionPool = {} // 仅包含0~40秒的交易,40~59秒的交易将被堆积到actionPool。

const my = {
}
