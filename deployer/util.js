const fs = require('fs')
const nodeInfo = require('./nodeInfo.js')
const exec = require('child_process').exec
const writeFileAsync = function (fileName, data) {
  return new Promise((resolve, reject) => {
    fs.writeFile(fileName, data, (err) => {
      if(!err)
      resolve("ok")
      else
      reject(err)
    })
  })
}
const readFileAsync = function (fileName) {
  return new Promise((resolve, reject) => {
    fs.open(fileName, 'r', (err, data) => {
      if(!err)
        resolve("ok")
      else
        resolve(null)
    })
  })
}
const execAsync = function (command) {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if(err) reject(err)
      else resolve("ok")
    })
  })
}
const getConfigData = function(data) {
  return `module.exports = {
    netType: 'mainnet', // 默认进入测试网
    consensus: ${data.consensus}, // 共识机制。可选设为 ConsPot, ConsAlone。
    protocol: 'http', // http|https|httpall
    host: ${nodeInfo.HOST}, // 本节点的从外部可访问的 IP or Hostname，不能是 127.0.0.1 或 localhost
    webPort: 6842, // 本节点的 Web服务端口号
    consPort: 6888, //共识协议交流端口
    p2pPort: 60842, //p2p组网端口
    // 如果使用 https 协议，必须填写以下内容，或在命令行参数中设置：
    sslKey: null, // ssl key file,
    sslCert: null, // ssl cert file,
    sslCA: null, // ssl ca file,
    link: 'http', // http|udp
    
    seedSet: [], // 系统默认的种子节点
    
    dbType: 'sqlite',
    dbName: 'Data.sqlite/tic.sqlite',
    
    NET_TYPE: ['mainnet', 'testnet', 'devnet'],
    NET_MAGIC: { mainnet: '1m1', testnet: '2t2', devnet: '3d3' },
    NET_PORT: { mainnet: 6842, testnet: 6842, devnet: 6842 },
    NET_SEEDSET: {
      mainnet: [],
      testnet: [],
      devnet: []
    },
    
    VERSION: '0.0.1',
    BLOCK_PERIOD: 60 * 1000, // 出块周期。毫秒数
    BLOCK_MAX_SIZE: 1 * 1024 * 1024, // 每个区块的最大容量：1M字节
    PEER_CHECKING_PERIOD: 60 * 1000, // 每隔多久ping一个邻居
    PEER_CHECKING_TIMEOUT: 10, // *60*1000, // 5分钟没有响应就认为邻居节点死了
    PEER_POOL_CAPACITY: 12, // 保持几个邻居节点
    
    GENESIS_EPOCHE: new Date('2019-06-06T00:00:00.000Z'), // 主网的创世时刻。1515341898018
    GENESIS_EPOCHE_TESTNET: new Date('2018-10-16T11:20:00.000Z'), // 测试网的创世时刻。
    GENESIS_MESSAGE: 'History is Future, Future is Now',
    GENESIS_MESSAGE_TESTNET: 'The Cabinet Office minister David Lidington today defended Philip Hammond’s decision to issue a new warning that a no-deal Brexit would significantly damage the economy.',
    GENESIS_MESSAGE_DEVNET: 'some big things start out small',
    GENESIS_HEIGHT: 0,
    COIN_INIT_AMOUNT: 6 * Math.pow(10, 9), // 原始发行60亿个币。应该命名为 baseAmount，因为这不是全部的，还会挖出新的来
    COIN_PRECISION: 6, // 每个币可细分到小数点后第几位
    MaxRBS: 10, //区块缓存栈最大容量
    
    SIGNER_THRESHOLD: 0,
    PACKER_THRESHOLD: 600,
    
    /* 数据库，HTTP 等设置（与时光链本身无关） */
    HTTP_BODY_LIMIT: '50mb',
    UPLOAD_LIMIT: 1048576, // 单位: Byte。
    SESSION_LIFETIME: 60 * 60 * 24 * 7, // 一星期
    // todo: 改名为 DB_*
    LIMIT_DEFAULT: 12,
    LIMIT_MAX: 1000,
    MARK_DELETED: 'MARK_DELETED',
    MARK_LINKED: 'MARK_LINKED', // 建立了关系（care, know, join 等）
    MARK_RELEASED: 'MARK_RELEASED', // 解除了关系（care, know, join 等）
    MIN_FEE_ActTransfer: 0,
    MIN_FEE_ActStorage: 0,
    INITIAL_ACCOUNT_TESTNET: { // 初始账户，用于首发TIC币。
      address: 'Ttm24Wb877P6EHbNKzswoK6yvnTQqFYaqo'
    }
    ,
    INITIAL_ACCOUNT_DEVNET: { // 初始账户，用于首发TIC币。
      address: 'TxAEimQbqVRUoPncGLrrpmP82yhtoLmxJE'
    }
    ,
    INITIAL_ACCOUNT: { // 初始账户，用于首发TIC币。
      address: 'TpNH7NQoYLYjCDiAJddQX1LP4BrzAQ2Vw7'
    }
    ,
    GENESIS_ACCOUNT: { // 创世账户，用于创建height=0创世块
      secword: "skill loyal dove price spirit illegal bulk rose tattoo congress few amount",
    }
}`
}
module.exports = {
  writeFileAsync,
  readFileAsync,
  getConfigData,
  execAsync,
}