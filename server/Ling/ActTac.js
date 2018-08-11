const Action = require('./Action.js')

/******************** Public of instance ********************/

const DAD=module.exports=function ActTac(prop) {
  this._class=this.constructor.name
  this.setProp(prop) // 没有定义 DAD.prototype._model，因此继承了上级类.prototype._model，因此通过this.setProp，继承了上级Action定义的实例自有数据。另一个方案是，调用 Action.call(this, prop)
  this.type=this.constructor.name
}
DAD.__proto__= Action
// DAD._table=DAD.name // 注释掉，从而继承父类Action的数据库表格名
const MOM=DAD.prototype
MOM.__proto__=Action.prototype

/******************** Shared by instances ********************/

MOM.validate=function(){
  return true
}

MOM.execute=async function(){
  return null
}
