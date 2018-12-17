const Action = require('./Action.js')

/******************** Public of instance ********************/

const DAD=module.exports=function ActStorage(prop) {
  this._class=this.constructor.name
  this.setProp(prop) // 没有定义 DAD.prototype._model，因此继承了上级Action.prototype._model，因此通过this.setProp，继承了上级Action定义的实例自有数据。另一个方案是，调用 Action.call(this, prop)
  this.type=this.constructor.name
}
DAD.__proto__= Action
// DAD._table=DAD.name // 注释掉，从而继承父类Action的数据库表格名
const MOM=DAD.prototype
MOM.__proto__=Action.prototype

/******************** Shared by instances ********************/

MOM.validate=function(){
  // check size, account balance >= fee, fee>wo.Config.MIN_FEE_ActStorage
  return this.fee>=wo.Config.MIN_FEE_ActStorage
}

MOM.execute=async function(){
  let actor= await wo.Account.getOne({Account: { address: this.actorAddress }})
  if (actor && actor.balance >= this.fee){
    await actor.setMe({Account:{ balance: actor.balance-this.fee }, cond:{ address:actor.address}})
    mylog.info('Excecuted action='+JSON.stringify(this.type+'--'+this.hash))
    return this
  }
  return null
}

/******************** Public of class ********************/

DAD.api={}
