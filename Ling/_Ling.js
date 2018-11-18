/* 所有对象实例的原型。 Ling=Logical Thing 逻辑对象，或 Living Thing 生物体 */

const Tool=new (require('../util/Egg.js'))() // 用以解除对 wo.Tool 的依赖

const DAD=module.exports=function Ling(){  // 一定要这样写，才能得到 Ling.name==='Ling'。不要写 var Ling=function()...，这样会 Ling.name===''。
  /** 1 private members of object 每个实例对象的私有成员：var ???; function ???(){} **/
  // let self = this

  /** 2 public members of object 每个实例对象的公开成员：this.???=...; **/
  //  this.constructor = arguments.callee // 让每个对象维护自己的constructor而不是依赖于其prototype的。但是，我在prototype里定义了正确的constructor，所以这里不写也可以。
  this._class=this.constructor.name // JSON.stringify() 只会导出ownProperty，但前端需要_class。因此定义给对象实例，而不是给对象原型。_xxx 只给前端，不给数据库。
  // 一定要初始化属性，即使初始化成undefined也有用。要是不初始化，hasOwnProperty(xxx) 就是 false 的。
  // this._data={};

  /** initialization: 初始化 **/
  // 导入外来属性值或初始化：this.setProp(prop)
}
// DAD.__proto__=Ling; // 子类继承Ling
// DAD._table=DAD.name

const MOM=DAD.prototype /*** ={ // 原型对象。
  constructor:DAD, // 如果完全重新定义了prototype，系统默认设好的Xxx.prototype.constructor===Xxx也没了，需要重设。或者不要完全重新定义prototype，而是单独定义每个 Xxx.prototype.mmm
//  __proto__:Ling.prototype, // 子对象继承Ling的原型
} **/

// DAD 和 MOM 不要用在方法内部。方法内部用 self=this 即可，能够被继承。而直接使用文件内私有变量无法继承。

/**** 3. public members shared by all instances 所有实例对象共享的公开成员（读共享，写创建）****/

/* 属性处理 */
MOM.setProp= function(prop) { // 设置参数 prop 给自身。参数优先。
  prop=prop||{}
  for (var key in this._model){
    if (prop.hasOwnProperty(key) && typeof prop[key]!=='undefined' && !(prop[key]!==prop[key]) && prop[key]!==Infinity){ // prop 优先级最高
      this[key]=prop[key]
    }else if (typeof this[key]==='undefined'){ // 当前对象本身已有的值 优先于 prototype._model 中的值
      // 必须完全重置数组或对象，因为 prototype._model里的 default:[]或{} 将是一个固定的地址，指向的空间存值后会一直保留，再把default赋给下一个，将会错误的携带这些值。
      let defaultValue=this._model[key].default
      if (Array.isArray(defaultValue)) {
        this[key]=Tool.extend([], defaultValue, {deep:true}) // 深度拷贝，保证获得全新的对象或数组
      }else if (defaultValue && typeof defaultValue==='object'){ // 注意排除 defaultValue=null 的情况
        this[key]=Tool.extend({}, defaultValue, {deep:true})
      }else{
        this[key]=defaultValue
      }
    }
  }
  return this
}
MOM.getProp= function(prop) { // 合并参数 prop 和自身属性。参数优先。
  prop=prop||{}
  let newProp={}
  for (var key of Object.keys(this._model).sort()) { // 顺便还进行了排序
    if (typeof prop[key]!=='undefined' && !(prop[key]!==prop[key]) && prop[key]!==Infinity){
      newProp[key]=prop[key] // prop|prop比this更有优先级
    }else if (typeof this[key]!=='undefined' && !(this[key]!==this[key]) && this[key]!==Infinity){
      newProp[key]=this[key]
    }
  }
  return newProp
}
MOM.filterProp= function(prop) { // 根据模型属性，过滤参数 prop。（注意到，这里不依赖于当前对象自身属性，其实可以迁移为类方法。）
  prop=prop||{}
  for (var key in prop){
    if (!this._model.hasOwnProperty(key)
        || typeof prop[key]==='undefined' || prop[key]!==prop[key] || prop[key]===Infinity)
      delete prop[key]
  }
  return prop
}
MOM.getJson = function (option={}) {
  let data=this.getProp() // 排序过的对象数据
  for (let exkey of (option.exclude||[])){ // 忽略一些不需要签名的属性
    delete data[exkey]
  }
  let json=JSON.stringify(data)
  return json
}
MOM.normalize= async function() {
//    this._class=this.constructor.name
  if (global.solet && this.hasOwnProperty('ownerSid')) {
    this._data=this._data||{}
    this._data.owner=await this.getOwner()
  }
  return this
}
MOM.getOwner= async function() {
  if (global.solet && this.hasOwnProperty('ownerSid')) {
    if (this.ownerSid){
      return await wo.Person.getOne({ Person : {aiid: this.ownerSid}})
    }else{
      return wo.Config.PERSON_UNKNOWN
    }
  }
  return null
}

/* 事件处理 */

MOM._eventPool = null // 不要初始化为 {}, 而是在 addWatcher 里创建，否则所有子对象都继承了同一份 _eventPool
MOM.addWatcher = function(eventType, watcher) {
  if (this._eventPool == null) {
    this._eventPool = {}
  }
  if (typeof this._eventPool[eventType] == 'undefined') {
    this._eventPool[eventType] = []
  }
  this._eventPool[eventType].push(watcher)
}
MOM.dropWatcher = function(eventType, watcher) {
  if (this._eventPool != null
      && this._eventPool[eventType] instanceof Array) {
    let watcherSet = this._eventPool[eventType];
    for (let i in watcherSet) {
      if (watcherSet[i] === watcher) {
        watcherSet.splice(i, 1)
        break
      }
    }
  }
}
MOM.dropWatcherAll = function(eventType) {
  if (this._eventPool != null){
    this._eventPool[eventType]=undefined
  }
}
MOM.triggerEvent = function(eventType, params, callback) {
  let event = {
    type : eventType,
    target : this
  }
  if (this._eventPool != null
      && this._eventPool[event.type] instanceof Array) {
    let watcherSet = this._eventPool[event.type]
    for (let i in watcherSet) {
      watcherSet[i](event, params, callback)
    }
  }
}

/* 数据库存取 */

MOM.getMe= async function(option){
//mylog.info('<<<< 【Ling.proto】 new '+this._class+'().getMe('+JSON.stringify(option)+')')
  let self=this
  option=option||{}
  let where
  if (option.excludeSelf){
    where=self.filterProp(option[self._class])
  }else{ // 默认根据自身和参数一起查找
    where=self.getProp(option[self._class])
  }
  if (global.solet) { delete where.whenInserted; delete where.whenUpdated; } // 对选择单个对象，不允许使用whenXxx，以免 where 里只有whenXxx条件，能通过这里的检测，但到数据层，被清理成 where=true。而且，数据层的getData是不过滤where里的whenXxx的！
  if (typeof where==='object' && where && Object.keys(where).length>0){
    if (global.solet) { if (this.hasOwnProperty('mark')) where.mark='!='+wo.Config.MARK_DELETED }
    option.config=option.config||{}
    option.config.limit=1 // 保留可能的 config.order，允许前端指定非唯一的条目。
    return await wo.Data.getData({
      _table:this.constructor._table,
      where:where,
      config:option.config
    }).then(function(rowList){
      if (Array.isArray(rowList) && rowList[0]) {
        self.setProp(rowList[0]) // await self.setProp(rowList[0]).normalize(); // turn result data to ling.
//mylog.info('==== 【Ling.proto】 new '+self._class+'().getMe: '+JSON.stringify(self)+' >>>>')
        return self
      }
//mylog.info('==== 【Ling.proto】 new '+self._class+'().getMe: null >>>>')
      return null
    }).catch(console.log)
  }
  return null
}
MOM.setMe= async function(option){ // 修改数据是特殊的：又有set又有where。
//mylog.info('<<<< 【Ling.proto】 new '+this._class+'().setMe('+JSON.stringify(option)+')'); 
  let self=this
  option=option||{}
  let set
  if (option.excludeSelf){
    set=self.filterProp(option[self._class])
  }else{ // 默认是使用自身+参数
    set=self.getProp(option[self._class])
  }
  if (global.solet) {
    delete set.aiid; delete set.uuid  // 不允许修改aiid/uuid。
    if (wo.Config.dbType==='mysql') {
      delete set.whenInserted; delete set.whenUpdated
    }else if(wo.Config.dbType==='sqlite' && this.hasOwnProperty('whenUpdated')) {
      delete set.whenInserted; set.whenUpdated=new Date()
    }
  }
  let where
  if (option.cond){
    where=self.filterProp(option.cond)
  }else if (option[self._class] && option[self._class][self._tablekey]) {
    where={}; where[self._tablekey]=option[self._class][self._tablekey]
  }else if (self[self._tablekey]){
    where={}; where[self._tablekey]=self[self._tablekey]
  }else{
    return null
  }
  if (typeof where==='object' && where && Object.keys(where).length>0  // 必须设置where。否则，数据库层就会修改任意第一个！
      && typeof set==='object' && set && Object.keys(set).length>0){
    if (global.solet) { if (this.hasOwnProperty('mark')) where.mark='!='+wo.Config.MARK_DELETED }
// sqlite不支持update语句里的limit/order    option.config=option.config||{}; option.config.limit=1; // 保留可能的 config.order，允许前端指定非唯一的条目。
    return await wo.Data.setData({
      _table:this.constructor._table,
      where:where, 
      set:set,
      config:{limit:1}
    }).then(function(rowList){
      if (Array.isArray(rowList) && rowList[0]) {
        self.setProp(rowList[0]); // await self.setProp(rowList[0]).normalize()
//mylog.info('==== 【Ling.proto】new '+self._class+'().setMe: '+JSON.stringify(self)+' >>>>')
        return self
      }else{
//mylog.info('==== 【Ling.proto】new '+self._class+'().setMe: null >>>>')
        return null
      }
    }).catch(console.log)
  }
  return null
}
MOM.addMe= async function(option){
//mylog.info('<<<< 【Ling.proto】 new '+this._class+'().addMe('+JSON.stringify(option)+')')
  let self=this
  option=option||{}
  let set
  if (option.excludeSelf){
    set=self.filterProp(option[self._class])
  }else{ // 默认是使用自身+参数
    set=self.getProp(option[self._class])
  }
  if (global.solet) { 
    if (wo.Config.dbType==='mysql') {
      delete set.whenInserted
      delete set.whenUpdated
    }else if (wo.Config.dbType==='sqlite' && this.hasOwnProperty('whenInserted')) {
      set.whenUpdated=set.whenInserted=new Date()
    }
  }
  if (this.hasOwnProperty('uuid')) set.uuid=require('uuid').v1()
  return await wo.Data.addData({
    _table:this.constructor._table, 
    set:set,
    config:{limit:1}
  }).then(function(rowList){
    if (Array.isArray(rowList) && rowList[0]) {
      self.setProp(rowList[0]); // await self.setProp(rowList[0]).normalize(); // self.normalize(rowList[0])
//mylog.info('==== 【Ling.proto】 new '+self._class+'().addMe: '+JSON.stringify(self)+' >>>>')
      return self;
    }else{
//mylog.info('==== 【Ling.proto】 new '+self._class+'().addMe: null >>>>')
      return null;
    }
  }).catch(console.log)
}
MOM.hideMe= async function(option){
//mylog.info('<<<< 【Ling.proto】 new '+this._class+'().hideMe('+JSON.stringify(option)+')')
  let self=this
  option=option||{}

  let where
  if (option.excludeSelf){
    where=self.filterProp(option[self._class])
  }else if (option[self._class] && option[self._class][self._tablekey]) {
    where={}; where[self._tablekey]=option[self._class][self._tablekey]
  }else if (this[self._tablekey]){
    where={}; where[self._tablekey]=this[self._tablekey]
  }else{
    where=self.getProp(option[self._class])
  }
  if (typeof where==='object' && where && Object.keys(where).length>0){ // 必须设置where。否则，数据库层就会修改任意第一个！
    if (self.hasOwnProperty('mark')) {
      return await wo.Data.setData({
        _table:this.constructor._table,
        where:where,
        set:{mark:wo.Config.MARK_DELETED}, // for global.solet only
        config:{limit:1}
      }).then(function(rowList){
        if (Array.isArray(rowList) && rowList[0]) {
          self.setProp(rowList[0]); // await self.setProp(rowList[0]).normalize();
//mylog.info('==== 【Ling.proto】 new '+self._class+'().hideMe('+JSON.stringify(self)+' >>>>')
          return self
        }else{
//mylog.info('==== 【Ling.proto】 new '+self._class+'().hideMe: null >>>>')
          return null
        }
      }).catch(console.log)
    }
  }
  return null
}
MOM.dropMe= async function(option){
  let self=this
  option=option||{}

  let where
  if (option.excludeSelf){
    where=self.filterProp(option[self._class])
  }else if (option[self._class] && option[self._class][self._tablekey]) {
    where={}; where[self._tablekey]=option[self._class][self._tablekey]
  }else if (this[self._tablekey]){
    where={}; where[self._tablekey]=this[self._tablekey]
  }else{
    where=self.getProp(option[self._class])
  }
  if (typeof where==='object' && where && Object.keys(where).length>0){ // 必须设置where。否则，数据库层就会修改任意第一个！
    return await wo.Data.dropData({
      _table:this.constructor._table,
      where:where,
      config:{limit:1} // 目前sqlite.js没有用到config
    }).then(function(report){
      return report
    }).catch(console.log);
  }
  return null
} 

/**** 4. public API of class 类的公开成员（API） ****/
// 在这些API里，Ling 进行默认的认证和授权。可在各子类中覆盖。

DAD._init=async function(){
  await this.createTable()
  return this
}

DAD.createTable=async function(){
  mylog.info('Creating table '+this._table)
  let fieldSet={} // 数据库表格的字段集合
  for (let key in this.prototype._model){
    fieldSet[key]=this.prototype._model[key][wo.Config.dbType]
  }
  let result= await wo.Data.createTable({_table:this._table, set:fieldSet})
  mylog.info('******* Table is ready: '+this._table)
  return this
}

DAD.getCount= async function(option){
  option=option||{}
  if (global.solet) { 
    option[this.name]=option[this.name]||{}
    option[this.name].starId=option[this.name].starId||option.starId // 后台内部调用时，调用者也许已经准备好了 option.SELF.starId
  }
  let where=this.prototype.filterProp(option[this.name]) // 对 getCount，允许where为空

  if (global.solet) { if (this.prototype._model['mark']) where.mark='!='+wo.Config.MARK_DELETED }
  return await wo.Data.getNumber({
    _table:this._table,
    where:where,
    field:'*',
    func:'count'
  }).then(function(result){
    return result
  }).catch(console.log)
}

DAD.getSum=async function(option){
  option=option||{}
  if (option.field){
    let where=this.prototype.filterProp(option[this.name])
    return await wo.Data.getNumber({
      _table:this._table,
      where:where,
      field:option.field,
      func:'sum'
    }).then(function(result){
      return result
    }).catch(console.log)
  }
  return null
}

// http://localhost:6327/Person_getAllCall?param=[100000000019]&_proc=getAllFriend
DAD.getAllCall= async function(option){
  let SELF=this
  if (option._proc) {
    return await wo.Data.callProc(option).then(function(rowList){
      if (Array.isArray(rowList)){
        for(let row of rowList){
          row.__proto__=SELF.prototype
          row._class=SELF.name
//          row._data={}
        }
//mylog.info('==== 【Ling.proto】 '+self.name+'.getAllCall: '+JSON.stringify(rowList)+' >>>>')
        return rowList
      }
//mylog.info('==== 【Ling.proto】 '+self.name+'.getAll: [] >>>>')
      return []
    }).catch(console.log)
  }
  return []
}

DAD.getAll= async function(option){
  //mylog.info('<<<< 【Ling.proto】 new '+this.name+'().getAll('+JSON.stringify(option)+')')
  option=option||{}
  let SELF=this
  if (global.solet) {
    option[this.name]=option[this.name]||{}
    option[this.name].starId=option[this.name].starId||option.starId // 后台内部调用时，调用者也许已经准备好了 option.SELF.starId
  }
  let where=SELF.prototype.filterProp(option[SELF.name]) // 对 getAll，允许where为空
  if (global.solet) { if (this.prototype._model['mark']) where.mark='!='+wo.Config.MARK_DELETED }
  return await wo.Data.getData({
    _table:this._table,
    where:where,
    config:option.config
  }).then(function(rowList){
    if (Array.isArray(rowList)){
      for(let row of rowList){
        row.__proto__=SELF.prototype
        row._class=SELF.name
  //          row._data={}
      }
  //mylog.info('==== 【Ling.proto】 new '+SELF.name+'().getAll: '+JSON.stringify(rowList)+' >>>>')
      return rowList
    }
  //mylog.info('==== 【Ling.proto】 new '+SELF.name+'().getAll: [] >>>>')
    return []
  }).catch(console.log)
}

DAD.getOne= async function(option){
  if (option && typeof option[this.name]==='object') { // 从类里调用，就必须给出参数
    if (global.solet) {
      option[this.name].starId=option[this.name].starId||option.starId; // todo: 要不要区分Person和其他？ // 后台内部调用时，调用者也许已经准备好了 option.SELF.starId
    }
    option.excludeSelf=true
    return await new this().getMe(option)
  }
  return null
}

DAD.setOne= async function(option){ // 默认的授权条件：已登录 && ( 是自己 || 是主人 ) 。
  if (option && typeof option[this.name]==='object'){
    if (global.solet) {
      if (option.cond && typeof option.cond==='object'){
        option.cond.starId=option.cond.starId||option.starId // 后台内部调用时，调用者也许已经准备好了 option.cond.starId
      }else if (this.name==='Person' && option[this.name].aiid===option._token.onlineSid){ // 只能本人设置
        option.cond={aiid:option._token.onlineSid}
      }else if (this.name!=='Person' && option[this.name].aiid) { // 只能主人设置
        option.cond={aiid:option[this.name].aiid, ownerSid:option._token.onlineSid, starId:option.starId} // 强迫只能主人设置（todo: 例如对message的投票，不需要是主人）。加上 ownerSid，防止冒名。如果这个ling没有ownerSid，会在下一层被过滤掉。
      }
    }
    if (option.cond && typeof option.cond==='object') {
      option.excludeSelf=true
      return await new this().setMe(option)
    }
  }
  return null
}

DAD.addOne= async function(option){ // 默认的授权条件：已登录
  if (option && typeof option[this.name]==='object') {
    if (global.solet) {
      option[this.name].ownerSid=option._token.onlineSid
      option[this.name].starId=option[this.name].starId||option.starId // 后台内部调用时，调用者也许已经准备好了 option.SELF.starId
    }
//    option.excludeSelf=true // 需要引入 _model 里的默认值，因此不能 excludeSelf
    return await new this().addMe(option)
  }
  return null
}

DAD.hideOne= async function(option){ // 默认的授权条件：已登录 && 是主人 。
//mylog.info('<<<<<< 【Ling】'+this.name+'.hideOne('+JSON.stringify(option)+')');
  if (global.solet && option._token.isOnline() && typeof option[this.name]==='object') { // 登录后才能更新。
    if (this.name!=='Person' && option[this.name].aiid) {
      option[this.name]={aiid:option[this.name].aiid, ownerSid:option._token.onlineSid, starId:option.starId} // 强迫只能主人设置。加上 ownerSid，防止冒名。如果这个ling没有ownerSid，会在下一层被过滤掉。
      return await new this().hideMe(option)
    }
  }
  return null
}

DAD.dropOne=async function(option){
  if (option && typeof option[this.name]==='object'){
    return await new this().dropMe(option)
  }
  return null
}

DAD.dropAll=async function(option){
  let SELF=this
  option=option||{}

  let where=SELF.prototype.filterProp(option[SELF.name])
  if (typeof where==='object' && where && Object.keys(where).length>0){ // 要不要允许where为空对象，从而删除所有数据？
    return await wo.Data.dropData({
      _table:this._table,
      where:where,
      config:option.config // 目前sqlite.js用不到这个config
    }).then(function(report){
      return report
    }).catch(console.log)
  }
  return null
}

/**** 5. private members of class 类的私有成员****/
// var my={}