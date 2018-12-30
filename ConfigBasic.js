'use strict'
module.exports = { // 全大写字母的，代表系统常量，不要在 userConfig 或命令行参数里覆盖。小写驼峰的，是用户可以覆盖的。
  netType: 'devnet', // 默认进入测试网
  consensus: 'pot', // 共识机制。可选设为 ConsPot, ConsAlone。
  protocol: 'http', // http|https|httpall
  host: null, // 本节点的从外部可访问的 IP or Hostname，不能是 127.0.0.1 或 localhost
  port: 8888, // 本节点的 Web服务端口号
  // 如果使用 https 协议，必须填写以下内容，或在命令行参数中设置：
  sslKey: null, // ssl key file,
  sslCert: null, // ssl cert file,
  sslCA: null, // ssl ca file,
  link: 'http', // http|udp

  seedSet: [], // 系统默认的种子节点

  dbType: 'sqlite',
  dbName: 'data.sqlite/tic.sqlite',
  redisIndex: 0,
  
  NET_TYPE: ['mainnet', 'testnet', 'devnet'],
  NET_MAGIC: { mainnet: '1m1', testnet: '2t2', devnet: '3d3' },
  NET_PORT: { mainnet: 8888, testnet: 8888, devnet: 8888 },
  NET_SEEDSET: {
    mainnet: ['http://mainnet.bittic.net:8888'],
    testnet: ['http://testnet.bittic.net:8888'],
    devnet: []
  },

  VERSION: '0.0.1',
  BLOCK_PERIOD: 60, // 出块周期(s)
  BLOCK_MAX_SIZE: 1 * 1024 * 1024, // 每个区块的最大容量：1M字节
  PEER_CHECKING_PERIOD: 60 * 1000, // 每隔多久ping一个邻居
  PEER_CHECKING_TIMEOUT: 10, // *60*1000, // 5分钟没有响应就认为邻居节点死了
  PEER_POOL_CAPACITY: 10, // 保持几个邻居节点

  GENESIS_HEIGHT: 0,
  GENESIS_BLOCK : {
    mainnet: {
      timestamp: new Date('2019-06-06T00:00:00.000Z'),
      message: 'History is Future, Future is Now'
    },
    testnet: {
      timestamp: new Date('2019-01-01T18:18:00.000Z'),
      message: 'The Cabinet Office minister David Lidington today defended Philip Hammond’s decision to issue a new warning that a no-deal Brexit would significantly damage the economy.'    
    },
    devnet: {
      timestamp: '',
      message: 'some big things start out small'    
    }
  },
  COIN_INIT_AMOUNT: 6 * Math.pow(10, 9), // 原始发行60亿个币。应该命名为 baseAmount，因为这不是全部的，还会挖出新的来
  COIN_PRECISION: 6, // 每个币可细分到小数点后第几位
  MaxRBS: 10, //区块缓存栈最大容量

  MIN_FEE_ActTransfer: 0,
  MIN_FEE_ActStorage: 0,
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

  GENESIS_ACCOUNT: { // 创世账户，用于创建height=0创世块
    secword: "skill loyal dove price spirit illegal bulk rose tattoo congress few amount",
    //    pubkey: '656315fb1a34dafbaba2421cb2a6e6685754a0e68dab28be9b90201b4220acd1',
    //    seckey: '5334cce097b645559de70d365292bb1ad045f22a1915df0e1790d1f1da6de617656315fb1a34dafbaba2421cb2a6e6685754a0e68dab28be9b90201b4220acd1',
    //    address: 'Tq4YQAbMAmoNmUK1mBDi9rqPoeCofawbCa' 
  },
  INITIAL_ACCOUNT: {
    mainnet: {
      address: 'TpNH7NQoYLYjCDiAJddQX1LP4BrzAQ2Vw7'
    },
    testnet: {
      //    secword: 'window air repeat sense bring smoke legend shed accuse loan spy fringe'
      //    pubkey: 'd1ed688dccd996c11cba2749d3a916977b0c5977a1d40d1b5ad83606e3303150',
      //    seckey: '3d42f647287f315e91236be24ed2e13654e0471c9c82b0bf43b96146020b6863d1ed688dccd996c11cba2749d3a916977b0c5977a1d40d1b5ad83606e3303150',
      address: 'Ttm24Wb877P6EHbNKzswoK6yvnTQqFYaqo'
    },
    devnet: {
      secword: 'clever journey cave maze luxury juice trigger discover bamboo net shoot put',
      //    pubkey: '0fee122794b94feadcc07a72e69110e1000b6515ea67b4dba90f20dc48f999f8',
      //    seckey: 'df814a79def4fa6e5bff2a19f44a5811163600db35670dca0b9bacc0994db05f0fee122794b94feadcc07a72e69110e1000b6515ea67b4dba90f20dc48f999f8',
      address: 'TxAEimQbqVRUoPncGLrrpmP82yhtoLmxJE'
    }
  },
  DEV_ACCOUNT: [
    {
      secword: 'brand moment media marine enroll verb blanket toilet unit exercise choose nuclear',
      pubkey: 'f21b1b5b4e533ad52ac5f55ba10da1d978e3cc54f3a28daa80475ccfd3b43f3c',
      seckey: 'c34ccff7ddcbac11a1275ef5339a6df11f0beab5dbf7283f964bde1201576005f21b1b5b4e533ad52ac5f55ba10da1d978e3cc54f3a28daa80475ccfd3b43f3c',
      address: 'Tm3C6oELhJsF5EZBPD1ppdfNjgd2RxMUmj'
    }
  ]

}
