'use strict'
// 创世块时刻所在分钟的第0.000到59.999为0，下一分钟0.000~59.999为1，...... 所以这代表了 当前所在分钟将要出的块的高度。注意，反向也成立，创世时刻之前是-1，-2，...
Date.time2height = function (time = new Date()) {
  if (time instanceof Date && time.valueOf()) {
    let genesis = wo.Config.GENESIS_EPOCH
    genesis.setSeconds(0)
    genesis.setMilliseconds(0)
    return Math.floor((time - genesis) / (wo.Config.BLOCK_PERIOD * 1000))
  }
  return null
}

Date.time2epoch = function (time) { // time could be string or Date object
  if (time instanceof Date && time.valueOf()) { // 万一 time 是 Invalid Date，就需要用 valueOf(), toJSON(), getTime() 来检测。
    return time
  } else if (/^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d\.\d\d\dZ$/.test(time)) {
    return new Date(time)
  } else if (time === 'nextMin') { // 下一分钟（距离当前时刻之后最近（包括当前时刻本身，如果正好是第0秒000毫秒）的第0秒）
    return new Date(Math.ceil(Date.now() / 60000) * 60000) // 注意 Date.parse() 会忽略毫秒，所以用 new Date().getTime()或new Date().valueOf()或Date.now()来获取。
  } else if (time === 'prevHour') { // 前一小时
    time = new Date()
    time.setHours(time.getHours() - 1)
    time.setMinutes(0)
    time.setSeconds(0)
    time.setMilliseconds(0)
    return time
  } else if (time === 'now') {
    return new Date()
  }
  return null
}

module.exports = Date
