const Action = require('./Action.js')

/******************** Public of instance ********************/

const DAD=module.exports=function ActTransfer(prop) {
  this._class=this.constructor.name
  this.setProp(prop) // 没有定义 ActTransfer.prototype._model，因此继承了上级Action.prototype._model，因此通过this.setProp，继承了上级Action定义的实例自有数据。另一个方案是，调用 Action.call(this, prop)
  this.type=this.constructor.name
}
DAD.__proto__= Action
// DAD._table=DAD.name // 注释掉，从而继承父类Action的数据库表格名
const MOM=DAD.prototype
MOM.__proto__=Action.prototype

/******************** Shared by instances ********************/

MOM.validate=function(){
  // return wo.Crypto.isAddress(this.toAddress)
  return wo.Crypto.isAddress(this.toAddress) && this.fee>=wo.Config.MIN_FEE_ActTransfer
  // && wo.Account.accountPool[this.actorAddress].balance>this.amount+this.fee   //Todo:引入缓存账户
  &&this.toAddress != this.actorAddress
} 

MOM.execute=async function(){
  let sender= await wo.Account.getOne({Account: { address: this.actorAddress }})
  if (sender && sender.type !== 'multisig' && this.toAddress != this.actorAddress && sender.balance >= this.amount + this.fee){
    await sender.setMe({Account:{ balance: sender.balance-this.amount-this.fee }, cond:{ address:sender.address}})
    let getter= await wo.Account.getOne({Account: { address: this.toAddress }}) || await wo.Account.addOne({Account: { address: this.toAddress }})
    await getter.setMe({Account:{ balance: getter.balance+this.amount }, cond:{ address:getter.address}})
    // mylog.info('Excecuted action='+JSON.stringify(this))
    return this
  }
  // mylog.info('balance('+sender.address+')='+sender.balance+' is less than '+this.amount+', 无法转账')
  return null
}

/******************** Public of class ********************/

DAD.api={}
