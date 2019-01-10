var Ling = require('fon.ling')

/** ****************** Public of instance ********************/

const DAD = module.exports = function Account (prop) { // 构建类
  this._class = this.constructor.name
  this.setProp(prop)
}
DAD.__proto__ = Ling
DAD._table = DAD.name
const MOM = DAD.prototype // 原型对象
MOM.__proto__ = Ling.prototype

/** ****************** Shared by instances ********************/
MOM._tablekey = 'hash'
MOM._model = {
  type: { default: 'user', sqlite: 'TEXT', mysql: 'VARCHAR(100)' },
  user: { default: undefined, sqlite: 'TEXT', mysql: 'String' }, // 隶属于哪个真人用户
  address: { default: undefined, sqlite: 'TEXT UNIQUE', mysql: 'String(50)' },
  pubkey: { default: undefined, sqlite: 'TEXT UNIQUE', mysql: 'Binary(32)' },
  balance: { default: 0, sqlite: 'NUMERIC', mysql: 'BigInt' },
  secondPubkey: { default: undefined, sqlite: 'TEXT', mysql: 'Binary(32)' },
  secondSignature: { default: undefined, sqlite: 'TEXT', mysql: 'BigInt' },
  multiSignatures: { default: undefined, sqlite: 'TEXT', mysql: 'Text' },
  producedBlocks: { default: undefined, sqlite: 'INTEGER', mysql: 'BigInt' },
  missedBlocks: { default: undefined, sqlite: 'INTEGER', mysql: 'BigInt' },
  fees: { default: 0, sqlite: 'NUMERIC', mysql: 'BigInt' },
  rewards: { default: 0, sqlite: 'NUMERIC', mysql: 'BigInt' },
  lockHeight: { default: undefined, sqlite: 'INTEGER', mysql: 'BigInt' },
  json: { default: {}, sqlite: 'TEXT' } // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
}

/** ********************* Public of class *******************/

DAD.api = {} // 面向前端应用的API

DAD.api.getAccount = async function (option) { // 根据 address 返回已有账户。用于查询。
  if (option && option.Account && wo.Crypto.isAddress(option.Account.address)) { // 检查一些在通用的 Ling.getOne() 里不能检查的东西
    return await DAD.getOne(option)
  }
  return null
}

DAD.getBalance = DAD.api.getBalance = async function (option) {
  if (option && option.Account && option.Account.address) {
    return await wo.Store.getBalance(option.Account.address)
  }
  return null
}
