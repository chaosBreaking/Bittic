var Ling = wo.Ling

/******************** Public of instance ********************/

const DAD=module.exports=function Account(prop) { // 构建类
  this._class=this.constructor.name
  this.setProp(prop)
}
DAD.__proto__=Ling
DAD._table=DAD.name
const MOM=DAD.prototype // 原型对象
MOM.__proto__=Ling.prototype

/******************** Shared by instances ********************/
MOM._tablekey='hash'
MOM._model={
  version:        { default:0,         sqlite:'INTEGER' }, // 账户需要版本号吗？
  type:           { default:'user',  sqlite:'TEXT',     mysql:'VARCHAR(100)' },
  user:           { default:undefined, sqlite:'TEXT',   mysql:'String' }, // 隶属于哪个真人用户
  name:           { default:undefined, sqlite:'TEXT',   mysql:'String(20)' },
  address:        { default:undefined, sqlite:'TEXT UNIQUE',   mysql:'String(50)' },
  pubkey:         { default:undefined, sqlite:'TEXT UNIQUE',   mysql:'Binary(32)' },
  secondpubkey:   { default:undefined, sqlite:'TEXT',   mysql:'Binary(32)' },
  secondSignature:{ default:undefined, sqlite:'TEXT',   mysql:'BigInt' },
  balance:        { default:0,         sqlite:'NUMERIC',   mysql:'BigInt' },
  multisignatures:{ default:undefined, sqlite:'TEXT',   mysql:'Text' },
  blockHash:      { default:undefined, sqlite:'TEXT UNIQUE',   mysql:'String(64)' }, // luk.lu: 这是什么？
  producedblocks: { default:undefined, sqlite:'INTEGER',mysql:'BigInt' },
  missedblocks:   { default:undefined, sqlite:'INTEGER',mysql:'BigInt' },
  fees:           { default:0,         sqlite:'NUMERIC',   mysql:'BigInt' },
  rewards:        { default:0,         sqlite:'NUMERIC',   mysql:'BigInt' },
  lockHeight:     { default:undefined, sqlite:'INTEGER',mysql:'BigInt' },
  json:           { default:{},        sqlite:'TEXT' } // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
}

/*********************** Public of class *******************/

DAD.api={} // 面向前端应用的API

DAD.api.getAccount = async function(option){ // 根据 address 返回已有账户。用于查询。
  if (option && option.Account && wo.Crypto.isAddress(option.Account.address)){ // 检查一些在通用的 Ling.getOne() 里不能检查的东西
    return await DAD.getOne(option)
  }
  return null
}

DAD.api.openAccount=async function(option){ // 根据 pubkey 返回已有账户或新建一个。用于登录。
  if (option && typeof option.Account==='object' && option.Account.pubkey && option.signature && option.msg){
    if (option.msg.timestamp && (option.msg.timestamp-Date.now())<60*1000 // 让前端用户对当前时间签名，60秒内有效，证明自己拥有私钥，从而防止恶意前端窃取别人的一次签名后，反复使用来登陆别人账号。
      && wo.Crypto.verify( option.msg, option.signature, option.Account.pubkey)) {
      let account=await DAD.getOne({ Account:{ address: wo.Crypto.pubkey2address(option.Account.pubkey) } }) // 已有账户
        || await DAD.addOne( { Account:{ pubkey: option.Account.pubkey, address:wo.Crypto.pubkey2address(option.Account.pubkey) } }) // 新建一个
      if (account){
        return account
      }
    }
  }
  return null
}


DAD.getBalance=DAD.api.getBalance=async function(option){
  if (option && option.Account && option.Account.address){
    let account=await DAD.getOne({Account:{ address: option.Account.address }})
    if (account){
      return account.balance||0
    }
    //    let received=await wo.Action.getSum({Action:{toAddress: option.Account.address}, field:'amount'})
//    let sent=await wo.Action.getSum({Action:{actorAddress: option.Account.address}, field:'amount'})
//    return received.sum - sent.sum
    return 0
  }
  return null
}

/********************** Private in class *******************/

const my = {
}
