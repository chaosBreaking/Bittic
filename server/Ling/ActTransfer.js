const Action = require('./Action.js')

const DAD=module.exports=function ActTransfer(prop) {
  this._class='ActTransfer'
  this.setProp(prop) // 没有定义 ActTransfer.prototype._model，因此继承了上级Action.prototype._model，因此通过this.setProp，继承了上级Action定义的实例自有数据。另一个方案是，调用 Action.call(this, prop)
  this.type='ActTransfer'
}
DAD.__proto__= Action
const MOM=DAD.prototype
MOM.__proto__=Action.prototype

DAD.validater = async function(action){
  // if (sender && sender.type !== 'multisig' && action.toAddress != action.actorAddress && sender.balance >= action.amount + action.fee){
  let sender = await wo.Store.getBalance(action.actorAddress);
  return sender >= action.amount + action.fee && action.fee >= wo.Config.MIN_FEE_ActTransfer && action.toAddress != action.actorAddress
}

DAD.execute = async function(action){
  let sender = await wo.Store.getBalance(action.actorAddress);
  // if (sender && sender.type !== 'multisig' && action.toAddress != action.actorAddress && sender.balance >= action.amount + action.fee){
  if (action.toAddress != action.actorAddress && sender >= action.amount + action.fee){
    await wo.Store.decrease(action.actorAddress, action.amount + action.fee);
    await wo.Store.increase(action.toAddress, action.amount)
    return true
  }
  return null
}

DAD.api={}
