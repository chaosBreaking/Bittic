/** 最原始、基本的语言级别的功能 */

const DAD=module.exports=function Egg() {}
const MOM=DAD.prototype

MOM.extendMe = function(more, option){
  return MOM.extend(this,more,option)
}

MOM.cloneMe = function(){
  var objClone
  if (this.constructor == Object)  {
    objClone = new this.constructor()
  } else  {
    objClone = new this.constructor(this.valueOf())
  }
  for ( var key in this)  {
    if (objClone[key] != this[key]) {
      if (typeof (this[key]) == 'object') {
        objClone[key] = this[key].Clone()
      } else {
        objClone[key] = this[key]
      }
    }
  }
  objClone.toString = this.toString
  objClone.valueOf = this.valueOf
  return objClone
}

MOM.extend = function(dest, more, option) { // 给 dest 添加 more 里的属性。option决定是否继承、是否深度拷贝
  if (dest && more && typeof(dest)==='object' && typeof(more)==='object'){
    option=option||{}
    for (var key in more) {
      if (!option.inherit && !option.deep){ // 默认只拷贝more对象的自有成员
        if (Array.isArray(dest) && more.hasOwnProperty(key)) {
          dest.push(more[key]) // 对数组元素是添加到dest上，而不是替换掉原来的。
        }else if (more.hasOwnProperty(key)) {
          dest[key]=more[key]
        }
      }else if (option.inherit && !option.deep){ // 拷贝more及其继承的上级成员
        if (Array.isArray(dest)){ 
          if (more.hasOwnProperty(key)) dest.push(more[key]) // 对数组，永远是不拷贝继承的成员的
        }else{
          dest[key]=more[key]
        }
      }else if (option.deep){ // 深度拷贝
        if (option.inherit || more.hasOwnProperty(key)){
          if (Array.isArray(more[key])) {
            dest[key]=arguments.callee([], more[key], option)
          }else if (typeof(more[key])=="object"){
            dest[key]=arguments.callee({}, more[key], option)
          }else{
            if (Array.isArray(dest)){
              if (more.hasOwnProperty(key)) dest.push(more[key])
            }else {
              dest[key]=more[key]
            }
          }
        }
      }
    }
  }
  return dest
}

// 从数据库来：取出的JSON字符串，转换成对象。
// 从前端来：经过Node过滤后，value=req.param(...) 要么是string要么是对象/数组。如果前端预先 stringify 了，就全是 string。
MOM.json2obj=function (value, from){
  from = ['database', 'http'].indexOf(from)>=0 ? from : 'http'
//    if (value==='NaN' || value==='Infinity') { // 如果前端做了stringify，那么不可能收到这两者（NaN/Infinity会变成"null"，parse后成 null；'NaN/Infinity'会变成'"NaN/Infinity"'）。如果前端没有stringify，那么前端的 NaN/Infinity 将变成 'NaN'/'Infinity'，在此手动过滤成 null；也有微弱的可能性，用户输入了'NaN/Infinity'！保留哪种都可以。
//      value=null;
//    }else 
  if (typeof value==='string'){  // 警惕，JSON.parse('0.01')===0.01,  JSON.parse('1111111111111111111')===1111111111111111200, JSON.parse('1111111111111111111111')===1.1111111111111111e+21, 产生了溢出！为保证前后一致，强烈要求在前端进行 JSON.stringify(value)再传过来。
try {
    var tmp = JSON.parse(value);
    if (from==='http') {
      value=tmp;
    }else if (from==='database') { // 从mysql里来，只有json/text/varchar/enum/time/null类型会是 string，parse后可能是 object/语法错/boolean/null/number/string。
      if (typeof tmp==='object' && tmp!==null) {  // 注意不要把数据库里的'null'字符串转换成null。JSON.parse('null')===null, 而且 typeof null==='object'
        value=tmp;
      }else if (typeof tmp==='boolean') { // JSON.parse('true/false') 要不要转换回boolean？因为在 set2sql 里把 boolean 存为了字符串。这样也带来一个问题：如果用户偏偏在text字段里存了'true/false'，那么读出后变成了boolean!
        value=tmp;
      }
    }
}catch (exception){} // 放在 if 语句末尾，为了直接跳到最后的 return 语句。不然就要执行 catch (exception){ return value; };
  }else if (typeof value==='object' && value && !(value instanceof Date)){ // mysql 会把 date/datetime/timestamp 类型字段直接返回 Date 类型对象，不必转换。
    for (let k in value) {
      value[k]=arguments.callee(value[k], from); // 注意 递归时 带上 from !
    }
  }
  return Date.iso2Date(value)
}

MOM.isEmpty = function(value){
  switch (typeof value){
    case 'number': if (value===0 || value!==value) return true; return false;
    case 'object': 
      for (var attr in value){
        return false;
      }
/*	  	  if (JSON.stringify(value)==='{}'){
        return true;
      }
      if (Object.keys(value).length===0){ // Object.keys(null) 会出错。
        return true;
      } */
      return true
  case 'string': return (value==='')?true:false
  case 'undefined': return true
  case 'boolean': return value
  }
  return true
}

MOM.getJsType = function(o){ // 返回：一个字符串，表示标量类型 undefined,boolean,number,string 以及对象类型 Null, Object, Array, String, Boolean, Number, Function
  var t = typeof(o)
  return ((t==="object" || t==="function") // function是特殊的，typeof 结果是function, 但 Object.prototype.toString.call 结果是 [object Function]。我选用大写形式。
    ? Object.prototype.toString.call(o).slice(8,-1) // 可以是 Null, Object, Function, Boolean, String, Number, Array (如果 o===undefined, 那就是Undefined), 还可能是 Date, Math, Uint8Array(如果是个Buffer)
    : t) // 可以是 undefined, boolean, number, string
}

MOM.readPath = function(path, root) {
  var parent = root || global || window || {}
  var names = path.split('.')
  for (var i in names) {
    if (typeof parent === 'object' && names[i].match(/^\w+\(\)$/) && typeof parent[names[i].substring(0,names[i].length-2)] === 'function') { // 支持 xxx.myfunc().yyy 的函数形式作为一个路径节点。
      parent = parent[names[i].substring(0,names[i].length-2)]()
    }else if (typeof parent === 'object'  && names[i].match(/^\w+$/) && typeof parent[names[i]] != 'undefined' && parent[names[i]] != null) {
      parent = parent[names[i]]
    }else {
      return null
    }
  }
  return (parent===null || parent===undefined) ? null : parent
}

MOM.setPath = function(path, root, value) {
  var parent=root || global || window || {}
  var names=path.split('.')
  for (var i=0; i<names.length-1; i++) {
    if (typeof parent === 'object' && names[i].match(/^\w+$/)) {
      if (typeof parent[names[i]] !== 'object') parent[names[i]]={};
      parent = parent[names[i]]
    }else {
      return null
    }
  }
  return parent[names[names.length-1]]=value
}

// https://segmentfault.com/a/1190000006150186#articleHeader1
//    return obj instanceof Array; // 在不同iframe下不能正确识别Array。
//    return (typeof obj==='object' && obj.constructor.name==='Array'); // 或者 obj.constructor==Array。但是constructor属性是可以修改的，因此不靠谱。
//    return Object.prototype.toString.call(obj) === '[object Array]'; // 但Object.prototype.toString 也可以被修改。
//    return Array.isArray(obj); // 最靠谱，但isArray是es5的方法 所以某些情况下 为了兼容老的浏览器 并不会使用isArray的方法 会使用toString
Array.isArray=Array.isArray || function(arg) {
  return Object.prototype.toString.call(arg) === '[object Array]'
}

/**
 * 对数组中的对象，按对象的key进行sortType排序
 * @param key 数组中的对象为object,按object中的key进行排序
 * @param sortType true为降序；false为升序
 * 用法：
 * var ary=[{id:1,name:"b"},{id:2,name:"b"}];
 * ary.sort(keysort('name',true));
 * ary.sort(keysort('name',false));
 * ary.sort(keysort('id',false));
 */
Array.keysort=function(key,sortType) {
  return function(a,b){
      return sortType ? ~~(a[key] < b[key]) : ~~(a[key] > b[key]);
  }
}

require('./Date.js')