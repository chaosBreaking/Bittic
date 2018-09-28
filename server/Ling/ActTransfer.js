const Action = require('./Action.js')

const DAD=module.exports=function ActTransfer(prop) {
  this._class='ActTransfer'
  this.setProp(prop) // 没有定义 ActTransfer.prototype._model，因此继承了上级Action.prototype._model，因此通过this.setProp，继承了上级Action定义的实例自有数据。另一个方案是，调用 Action.call(this, prop)
  this.type='ActTransfer'
}
DAD.__proto__= Action
const MOM=DAD.prototype
MOM.__proto__=Action.prototype

DAD.validater = function(action){
  // return wo.Crypto.isAddress(this.toAddress)
  return action.fee >= wo.Config.MIN_FEE_ActTransfer && action.toAddress != action.actorAddress
  // && wo.Account.accountPool[this.actorAddress].balance>this.amount+this.fee   //Todo:引入缓存账户
}

DAD.execute = async function(action){
  let sender = await wo.Account.getOne({Account: { address: action.actorAddress }})
  if (sender && sender.type !== 'multisig' && action.toAddress != action.actorAddress && sender.balance >= action.amount + action.fee){
    await sender.setMe({Account:{ balance: sender.balance-action.amount-action.fee }, cond:{ address:sender.address}})
    let getter = await wo.Account.getOne({Account: { address: action.toAddress }}) || await wo.Account.addOne({Account: { address: action.toAddress }})
    await getter.setMe({Account:{ balance: getter.balance+action.amount }, cond:{ address:getter.address}})
    return action
  }
  return null
}

DAD.api={}
