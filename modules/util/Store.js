'use strict'
const storeAPI = require('./StoreApi.js')
/**
 * Store存储层，记录世界状态。
 * @param {*} dbType
 * @param {*} option
 */
function Store (dbType, option) {
  if (!new.target) { return new Store(dbType, option) }
  Object.defineProperties(this, {
    'dbType': {
      value: dbType,
      writable: false,
      enumerable: true
    },
    'storeAPI': {
      value: storeAPI(dbType, option),
      writable: false,
      enumerable: false
    },
    'worldState': {
      value: {},
      enumerable: true
    }
  })
}
Store.prototype._init = async function () {
  await this.storeAPI.flushdb()
  await Promise.all([
    this.storeAPI.setKey('recBlockStack', []),
    this.storeAPI.setKey('topBlock', '')
  ])
  return this
}
Store.prototype.setCurrentPhase = function (phase) {
  this.worldState.currentPhase = phase
}
Store.prototype.getCurrentPhase = function () {
  return this.worldState.currentPhase
}
Store.prototype.pushInRBS = async function (block) {
  let stack = await this.storeAPI.getKey('recBlockStack')
  stack.push(block)
  stack.length > wo.Config.MaxRBS ? stack.shift() : null
  await this.storeAPI.setKey('recBlockStack', stack)
}
Store.prototype.pushTopBlock = async function (block) {
  // getTopBlock 作用是 取高度，取hash 取整个块向外广播
  await this.storeAPI.setKey('topBlock', JSON.stringify({
    height: block.height,
    hash: block.hash
  }))
}
Store.prototype.getTopBlock = async function () {
  return JSON.parse(await this.storeAPI.getKey('topBlock'))
}
Store.prototype.getRBS = async function () {
  return await this.storeAPI.getKey('recBlockStack')
}

Store.prototype.getBalance = async function (address, coinType = 'balance') {
  return JSON.parse(await this.storeAPI.hget(address, coinType))
}
// 调用余额加减时，应该指明coinType，默认是balance代表TIC，其他用户发行代币应该传入其编号
Store.prototype.increase = async function (address, amount, coinType = 'balance') {
  return JSON.parse(await this.storeAPI.hincrbyfloat(address, coinType, amount))
}
Store.prototype.decrease = async function (address, amount, coinType = 'balance') {
  return JSON.parse(await this.storeAPI.hincrbyfloat(address, coinType, 0 - amount))
}

module.exports = Store

/**
 * 转账：store.increase & store.decrease
 */
