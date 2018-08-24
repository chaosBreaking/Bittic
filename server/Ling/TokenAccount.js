var Ling = wo.Ling

/******************** Public of instance ********************/

const DAD=module.exports=function TokenAccount(prop) { // 构建类
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
  type:           { default:'TicToken',sqlite:'TEXT',           mysql:'VARCHAR(100)' },
  token:          { default:undefined, sqlite:'TEXT',           mysql:'String(20)' },
  symbol:         { default:undefined, sqlite:'TEXT',           mysql:'VARCHAR(256)' }, 
  address:        { default:undefined, sqlite:'TEXT',           mysql:'String(50)' },
  balance:        { default:0,         sqlite:'NUMERIC',        mysql:'BigInt' },
  multiSignatures:{ default:undefined, sqlite:'TEXT',           mysql:'Text' },
  lockHeight:     { default:undefined, sqlite:'INTEGER',        mysql:'BigInt' },
  json:           { default:{},        sqlite:'TEXT' } // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
}

/*********************** Public of class *******************/

DAD.api={} // 面向前端应用的API

DAD.api.getAccount = async function(option){ // 根据 address 返回已有账户。用于查询。
/*前端数据结构
本来是：
    url:    localhost:6842/api/TokenAccount/getAccount
    POST:   {"TokenAccount":{"address":"Tkr8reV6FEySsgFPud29TGmBG4i2xW37Dw"}}
    GET:    localhost:6842/api/TokenAccount/getAccount?TokenAccount={"address":"Tkr8reV6FEySsgFPud29TGmBG4i2xW37Dw"}
本身二者都是基于账户地址的查询，为了使格式更加统一所以在下面的代码里将前端发来的"Account"转换为"TokenAccount"
这样的话查询结构为：
    url:    localhost:6842/api/TokenAccount/getAccount
    POST:   {"Account":{"address":"Tkr8reV6FEySsgFPud29TGmBG4i2xW37Dw"}}
    GET:    localhost:6842/api/TokenAccount/getAccount?Account={"address":"Tkr8reV6FEySsgFPud29TGmBG4i2xW37Dw"}
*/
  if (option && option.Account && wo.Crypto.isAddress(option.Account.address)){ // 检查一些在通用的 Ling.getOne() 里不能检查的东西
    option.TokenAccount = option.Account
    return await DAD.getOne(option)
  }
  return null
}

// DAD.api.openAccount=async function(option){ // 根据 pubkey 返回已有账户或新建一个。用于登录。
//   if (option && typeof option.Account==='object' && option.Account.pubkey && option.signature && option.msg){
//     if (option.msg.timestamp && (option.msg.timestamp-Date.now())<60*1000 // 让前端用户对当前时间签名，60秒内有效，证明自己拥有私钥，从而防止恶意前端窃取别人的一次签名后，反复使用来登陆别人账号。
//       && wo.Crypto.verify( option.msg, option.signature, option.Account.pubkey)) {
//       let account=await DAD.getOne({ Account:{ address: wo.Crypto.pubkey2address(option.Account.pubkey) } }) // 已有账户
//         || await DAD.addOne( { Account:{ pubkey: option.Account.pubkey, address:wo.Crypto.pubkey2address(option.Account.pubkey) } }) // 新建一个
//       if (account){
//         return account
//       }
//     }
//   }
//   return null
// }


DAD.getBalance=DAD.api.getBalance=async function(option){
  if (option && option.Account && option.Account.address){
    let account=await DAD.getAll({TokenAccount:{ address: option.Account.address }})
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
