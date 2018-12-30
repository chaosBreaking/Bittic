Date.time2height=function(time){ // 创世块时刻（必须是0秒000毫秒）0.000到59.999为0，下一分钟0.000~59.999为1，...... 所以这代表了 当前所在分钟将要出的块的高度。注意，反向也成立，创世时刻之前是-1，-2，...
  time=time || new Date()
  return Math.floor((time - wo.Config.GENESIS_EPOCHE) / (wo.Config.BLOCK_PERIOD * 1000))
}

Date.time2epoche=function(option){
  option=option||{}
  var time=option.time||new Date()
  var type=option.type||'nextMin'
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
module.exports = Date