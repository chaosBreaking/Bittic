Date.prototype.formatMe=function(format){
  format=(format && typeof format==='string')?format:'yyyy-mm-dd HH:MM:SS';
  var o = {
    'm+': this.getMonth() + 1, //月份 
    'q+': Math.floor((this.getMonth() + 3) / 3), //季度 
    'd+': this.getDate(), //日 
    'H+': this.getHours(), //小时 
    'M+': this.getMinutes(), //分 
    'S+': this.getSeconds(), //秒 
    's': this.getMilliseconds() //毫秒 
  };
  if (/(y+)/.test(format)) format = format.replace(RegExp.$1, (this.getFullYear() + '').substr(4 - RegExp.$1.length));
  for (var k in o){
    if (new RegExp('(' + k + ')').test(format)) format = format.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (('00' + o[k]).substr(('' + o[k]).length)));
  }
  return format;
}

Date.prototype.toString=function() {
  if (this.getTime()===0){
    return '0';
  }else if (this.getHours()===0 && this.getMinutes()===0 && this.getSeconds()===0) {
    return this.formatMe('yyyy-mm-dd');
  }else if (this.getTime()>0){
    return this.formatMe('yyyy-mm-dd HH:MM:SS');    
  }else{
    return '';
  }
}

Date.formatDate=function(date, format){ // date应当是合法的日期字符串 或合法的日期对象。否则，默认为是new Date()。
  if (typeof date==='string'){
    date=new Date(date);
  }else if (typeof date==='object' && date instanceof Date){
    date=date;
  }else{
    date=new Date();
  }
  if (date.toJSON()===null){
    date=new Date();
  }
  return date.formatMe(format);
}

Date.parseUserDate = function(obj){ // 把对象内部所有 dateXxx 键的 yyyy-mm-dd 值当作本地时间转换成 Date。
  for (var key in obj){
    if (/^date\w*$/.test(key) && typeof obj[key]==='string') {
      obj[key]=Date.user2Date(obj[key]);
    }else if (typeof obj[key]==='object' && obj[key] && !(obj[key] instanceof Date)){ // 不要过滤从后台获取后已经被iso2Date成Date元素的东西。
      arguments.callee(obj[key]);
    }
  }
  return obj;
}

Date.user2Date = function(value){ // 把可能被用户输入的日期字串转成Date。
  if (typeof value==='string') { // 处理被用户输入的日期string。
    if (/^\s*\d\d\d\d-\d\d?-\d\d?\s*$/.test(value)) {  // 警惕， 如果 value 为 Date 类型并且其 toString 后符合该字串，居然会通过 test! 导致 接下来的 match 调用失败。
      var ymd=value.match(/\d+/g);
      return new Date(ymd[0], ymd[1]-1, ymd[2]);  // 强迫把用户输入当成本地时。new Date 会把输入'yyyy-mm-dd'当作标准时！所以要么改成new Date(y,m,d) 或者 new Date('yyyy-mm-dd 00:00:00');
    }else if (/^\s*\d\d\d\d-\d\d?-\d\d?\s+\d\d?:\d\d?:\d\d?\s*$/.test(value)) {
      var ymd=value.match(/\d+/g);
      return new Date(ymd[0], ymd[1]-1, ymd[2], ymd[3], ymd[4], ymd[5]);
    }else if (/^\d\d\d\d-\d\d-\d\d\s+\d\d:\d\d:\d\d\.\d\d\d\s*$/.test(value)) {
      return new Date(value);
    }else if (/^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d\.\d\d\dZ$/.test(value)) {
      return new Date(value);
    }else if (parseInt(value)===0) { // 允许用户输入0，代表不限日期。
      return new Date(0);
    }
  }else if (value instanceof Date) {
    return value;
  }
  return new Date(undefined);  // 如果是无效日期字串，会被JSON成 null 送往后台，从而导致数据库也变成 (NULL)。
}

Date.iso2Date = function(value){ // recursively turn all elements of ISO date string to Date objects.
  if (typeof value==='string') {
    if (/^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d\.\d\d\dZ$/.test(value)){
      value = new Date(value);
    }
  }else if (typeof value==='object' && value && !(value instanceof Date)) {
    for (var k in value){
/*
      if (/^date\w*$/.test(k) && typeof value[k]==='string') { // 只处理被用户输入的日期string。
        if (/^\s*\d\d\d\d-\d\d?-\d\d?\s*$/.test(value[k])) {
          var ymd=value[k].match(/\d+/g);
          value[k]=new Date(ymd[0], ymd[1]-1, ymd[2]);
        }else if (/^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d\.\d\d\dZ$/.test(value[k])) {
          value[k]=new Date(value[k])
        }else if (parseInt(value[k])===0){
          value[k]=new Date(0);
        }else{
          value[k]=new Date(undefined);  // 如果是无效日期字串，JSON.stringify成 null 送往后台，从而导致数据库也变成 (NULL)。
        }
      }
*/
      value[k]=arguments.callee(value[k]);
    }
  }
  return value;
}

Date.time2height=function(time){ // 创世块时刻（必须是0秒000毫秒）0.000到59.999为0，下一分钟0.000~59.999为1，...... 所以这代表了 当前所在分钟将要出的块的高度。注意，反向也成立，创世时刻之前是-1，-2，...
  time=time||new Date()
  return Math.floor((time - wo.Config.GENESIS_EPOCHE)/60000)
}

Date.time2epoche=function(option){
  option=option||{}
  let time=option.time||new Date()
  let type=option.type||'nextMin'
  if (type==='nextMin'){ // 下一分钟（距离当前时刻之后最近（包括当前时刻本身，如果正好是第0秒000毫秒）的第0秒）
    return new Date(Math.ceil(time.getTime()/60000)*60000) // 注意 Date.parse() 会忽略毫秒，所以用 getTime
  }else if (type==='prevHour'){ // 前一小时
    time.setHours(time.getHours()-1)
    time.setMinutes(0)
    time.setSeconds(0)
    time.setMilliseconds(0)
    return time
  }
  return new Date()
}