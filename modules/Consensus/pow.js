'use strict'
const event = require('events')
const Block = require('../Block/BlockPow.js')
class Pow extends event {
  constructor () {
    super()
    this.difficult = 5
    this.nonce = 0
    this.magic = 'XJS'
    this.isStart = 10000
  }
  static getInstance () {
    if (!Pow.instance) {
      Pow.instance = new Pow()
    }
    return Pow.instance
  }
  async _init () {
    mylog.info('<====== POW计算程序启动 ======>')
    if (!topBlock) {
      var topBlock = {
        height: 0,
        hash: wo.Crypto.hash('0000'),
        timestamp: new Date()
      }
    }
    while (1) {
      topBlock = await this._start(topBlock)
      await wo.Chain.createBlock(topBlock)
      this.nonce = 100000
    }
  }
  async _start (topBlock) {
    if (topBlock && topBlock.hash) {
      let block = new wo.Block()
      await this._getDifficult(topBlock)
      while (this.isStart && !wo.Crypto.hash(topBlock.hash + this.nonce).startsWith(''.padStart(this.difficult, '0'))) {
        this.nonce++
      }
      block.hash = wo.Crypto.hash(topBlock.hash + this.nonce)
      block.lastBlockHash = topBlock.hash
      block.height = topBlock.height + 1
      block.difficult = this.difficult
      block.nonce = this.nonce
      mylog.info(`挖出新的区块! HASH: ${block.hash} -- height: ${block.height}`)
      return block
    }
  }
  async _stop () {
    this.isStart = 0
  }
  async _getDifficult (topBlock) {
    // 【new_target】 = 【prev_target】 * 【前2015个区块生成所用的时间】 /  1209600 （按标准每10分钟出一个块，2016个块所需要的秒数）
    if (topBlock.height && topBlock.height % 5 === 0) {
      let prev10Block = await wo.EventBus.call('Block', 'api', 'getBlock', { Block: { height: topBlock.height - 4 } })
      this.difficult = this.difficult * 5000 / ((Date.now() - new Date(prev10Block.timestamp)) / 5)
      mylog.info(`难度调整到${this.difficult}`)
    }
    return 0
  }
}
module.exports = Pow.getInstance()
