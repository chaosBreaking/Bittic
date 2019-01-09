'use strict'
var Ling = require('fon.ling')

/** ****************** Public members of instance ********************/

const DAD = module.exports = function Block (prop) { // 构建类
  this._class = this.constructor.name
  this.setProp(prop)
}
DAD.__proto__ = Ling
DAD._table = DAD.name
const MOM = DAD.prototype // 原型对象
MOM.__proto__ = Ling.prototype

/** ****************** Public members shared by instances ********************/
MOM._tablekey = 'hash'
MOM._model = { // 数据模型，用来初始化每个对象的数据
  hash: { default: undefined, sqlite: 'TEXT', mysql: 'VARCHAR(64) PRIMARY KEY' },
  version: { default: 0, sqlite: 'INTEGER', mysql: 'INT' }, // 用来升级
  type: { default: '', sqlite: 'TEXT', mysql: 'VARCHAR(100)' }, // 用来分类：普通块，虚拟块（如果某获胜节点没有及时出块，就用虚块填充）
  timestamp: { default: undefined, sqlite: 'TEXT', mysql: 'CHAR(24)' },
  height: { default: undefined, sqlite: 'INTEGER UNIQUE', mysql: 'BIGINT' },
  lastBlockHash: { default: null, sqlite: 'TEXT', mysql: 'VARCHAR(64)' },
  numberAction: { default: 0, sqlite: 'INTEGER', mysql: 'INT' },
  totalAmount: { default: 0, sqlite: 'NUMERIC', mysql: 'BIGINT' },
  totalFee: { default: 0, sqlite: 'NUMERIC', mysql: 'BIGINT' },
  rewardWinner: { default: 0, sqlite: 'NUMERIC', mysql: 'BIGINT' },
  rewardPacker: { default: 0, sqlite: 'NUMERIC' },
  packerPubkey: { default: undefined, sqlite: 'TEXT', mysql: 'BINARY(32)' },
  packerSignature: { default: undefined, sqlite: 'TEXT', mysql: 'BINARY(64)' },
  winnerPubkey: { default: '', sqlite: 'TEXT' }, // 抽签获胜者
  winnerMessage: { default: '', sqlite: 'TEXT' },
  winnerSignature: { default: '', sqlite: 'TEXT' },
  actionHashRoot: { default: undefined, sqlite: 'TEXT', mysql: 'BINARY(32)' }, // 虽然已经存了actionHashList，但存一个梅克根有助于轻钱包。
  actionHashList: { default: [], sqlite: 'TEXT' }, // 要不要在Block里记录每个事务？还是让每个事务自己记录所属Block？
  message: { default: '', sqlite: 'TEXT', mysql: 'VARCHAR(256)' },
  json: { default: {}, sqlite: 'TEXT' } // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
}

MOM.getReward = function (option) {
  option = option || {}
  var height = option.height || this.height || 1
  var rewardType = option.rewardType || 'rewardWinner'
  let reward = 0
  if (height > 0) {
    for (let milestone of my.milestones) {
      if (height >= milestone.start) { reward = milestone[rewardType] } else { break }
    }
  }
  return reward
}
MOM.getSupply = function (height) { // 计算当前流通总数：预发行数+挖出数
  height = height || this.height || 1
  let supply = wo.Config.COIN_INIT_AMOUNT // 创世块中预发行的数量
  if (height > 0) {
    for (let i = 0; i < my.milestones.length; i++) {
      if (height >= my.milestones[i + 1].start) {
        supply += my.milestones[i].reward * (my.milestones[i + 1].start - my.milestones[i].start)
      } else {
        supply += my.milestones[i].reward * (height - my.milestones[i].start)
      }
    }
  }
  return supply
}

MOM.packMe = function (actionBatch, lastBlock, keypair) { // 后台节点挖矿者的公私钥
  this.height = lastBlock ? lastBlock.height + 1 : wo.Config.GENESIS_HEIGHT
  this.rewardWinner = this.getReward({ rewardType: 'rewardWinner' })
  this.rewardPacker = this.getReward({ rewardType: 'rewardPacker' })
  this.totalFee = 0
  this.totalAmount = 0
  this.version = wo.Config.VERSION
  this.packerPubkey = keypair.pubkey
  this.lastBlockHash = lastBlock ? lastBlock.hash : null
  this.timestamp = lastBlock ? new Date() : wo.Config.GENESIS_EPOCH

  if (this.type !== 'SignBlock') {
    this.totalAmount = actionBatch.totalAmount
    this.totalFee = actionBatch.totalFee
    this.actionHashList = Object.keys(actionBatch.actionPool ? actionBatch.actionPool : {})
    // 计算默克根 传入的是对象的引用，如果计算默克根的函数改变其内容则区块记录也会被改变！
    this.actionHashRoot = wo.Crypto.getMerkleRoot(this.actionHashList)
    this.numberAction = this.actionHashList.length
  }

  this.signMe(keypair.seckey)
  this.hashMe()
  if (this.type !== 'SignBlock') { mylog.info('block ' + this.height + ' is created with ' + this.numberAction + ' actions') }
  return this
}
MOM.hashMe = function () {
  this.hash = wo.Crypto.hash(this.getJson({ exclude: ['hash'] }))
  return this
}
MOM.signMe = function (seckey) { // 全节点对自己生成的区块签字
  let json = this.getJson({ exclude: ['hash', 'packerSignature'] })
  this.packerSignature = wo.Crypto.sign(json, seckey)
  return this
}
MOM.verifyHash = function () {
  if (this.type === 'VirtBlock') return true
  return this.hash === wo.Crypto.hash(this.getJson({ exclude: ['hash'] }))
}
DAD.verifyHash = function (blockData) {
  let block = new DAD(blockData)
  return block.verifyHash()
}
MOM.verifySig = function () { // 验证其他节点发来的block
  if (this.type === 'VirtBlock') return true
  let json = this.getJson({ exclude: ['hash', 'packerSignature'] })
  let res = wo.Crypto.verify(json, this.packerSignature, this.packerPubkey)
  // 要不要继续验证actionList？
  return res
}
DAD.verifySig = function (blockData) {
  let block = new DAD(blockData)
  return block.verifySig()
}

MOM.verifyActionList = async function () {
  // 首先执行奖励
  if (this.type !== 'VirtBlock' && this.packerPubkey && this.winnerPubkey) {
    await wo.Store.increase(wo.Crypto.pubkey2address(this.winnerPubkey), this.rewardWinner)
    await wo.Store.increase(wo.Crypto.pubkey2address(this.packerPubkey), this.rewardPacker)
  }
  // 事务列表为0，直接返回
  if (this.actionHashList.length === 0) { return true }

  let actionList = await wo.Action.getAll({ Action: { blockHash: this.hash }, config: { limit: this.actionHashList.length } })
  let actionHashList = JSON.parse(JSON.stringify(this.actionHashList))
  if (actionList && actionList.length > 0) {
    for (let action of actionList) {
      if (actionHashList.indexOf(action.hash) !== -1) {
        await wo[action.type].execute(action) // 每次重启Account被清空，所以要在这里重建
        actionHashList.splice(actionHashList.indexOf(action.hash), 1)
      } else // 没找到
      {
        mylog.info('丢弃一个错误Action')
        await wo[action].dropOne({ [action.type]: action })
      }
    }
    if (actionHashList.length === 0) // 双向检查完毕，直接返回
    { return true }
  }

  // 丢失一些Action 开始向外同步
  while (actionHashList.length > 0) {
    let actionHash = actionHashList.pop()
    for (let count = 0; count < 4; count++) {
      var missAction = await wo.Peer.randomcast('/Action/getAction', { Action: { hash: actionHash } })
      if (missAction) {
        if (wo[missAction.type].validater(missAction)) {
          await wo[missAction.type].execute(missAction) // 执行该Action
          await wo[missAction.type].addOne({ [missAction.type]: missAction }) // 加入Action表
        }
        break
      } else if (count === 3 && !missAction) {
        return false
      }
      // 循环结束 还未拿到action 认为该区块不合法
    }
  }
  return true
}
MOM.executeActions = async function (actionPool) {
  // 缺少某交易时向其他节点请求，添加别人创建的区块，传入的actionPool里多余的交易加回到交易池
  if (this.actionHashList.length && this.actionHashList.length > 0) {
    for (let actionHash of this.actionHashList) {
      actionPool[actionHash].blockHash = this.hash
      await wo[actionPool[actionHash].type].addOne({ [actionPool[actionHash].type]: actionPool[actionHash] })
      await wo[actionPool[actionHash].type].execute(actionPool[actionHash])
      delete actionPool[actionHash]
    }
    // 残余交易处理
    if (Object.keys(actionPool).length === 0) { mylog.info(`共 ${this.actionHashList.length} Action写入数据库`) } else { Object.assign(wo.Action.actionPool, actionPool) }
  }
  return null
}

/** ********************* Public members of class *******************/

DAD.api = {} // 面向前端应用的API

DAD.api.getBlockList = async function (option) {
  return await DAD.getAll(option)
}

DAD.api.getBlock = async function (option) {
  return await DAD.getOne(option)
}

DAD.api.getActionList = async function (option) {
  if (option && option.Block && option.Block.hash && option.Block.height) {
    var block = await DAD.getOne(option)
    if (block && Array.isArray(block.actionHashList) && block.actionHashList.length > 0) {
      var actionList = []
      for (var actionHash of block.actionHashList) {
        var action = await wo.Action.getOne({ Action: { hash: actionHash } })
        if (action) actionList.push(action)
      }
      return actionList
    }
  }
  return null
}

/** ******************** Private members in class *******************/

const my = {
  milestones: [
    { rewardWinner: 60, rewardPacker: 6, penaltyPacker: -600, start: 1 }, // 第一年，1分钟一块
    { rewardWinner: 30, rewardPacker: 3, penaltyPacker: -300, start: 60 * 24 * 365 }, // 第二年，30秒一块
    { rewardWinner: 15, rewardPacker: 1.5, penaltyPacker: -150, start: (1 + 2) * 60 * 24 * 365 }, // 第三年，15秒一块
    { rewardWinner: 10, rewardPacker: 1, penaltyPacker: -100, start: (1 + 2 + 4) * 60 * 24 * 365 }, // 第四年，10秒一块
    { rewardWinner: 5, rewardPacker: 0.5, penaltyPacker: -50, start: (1 + 2 + 4 + 6) * 60 * 24 * 365 } // 第五年起，5秒一块
  ]
}
