'use strict'
const fs = require('fs')
const path = require('path')
const cluster = require('cluster')
const socket = require('socket.io')
global.mylog = require('fon.base/Logger.js')({ root: 'data.log', file: 'tic.log' })

function config () {
  // 配置参数（按优先级从低到高）：
  // ConfigBasic: 系统常量（全大写） 以及 默认参数（小写开头驼峰式）
  // ConfigCustom: 用户或应用自定义参数。本文件不应纳入版本管理。
  // ConfigSecret: 机密参数，例如哈希盐，webtoken密钥，等等。本文件绝对不能纳入版本管理。
  // 命令行参数
  const commander = require('commander')
  const deepmerge = require('deepmerge')
  const Crypto = require('tic.crypto')

  var Config = {}

  // 读取配置文件
  try {
    if (fs.existsSync(`${commander.configPath}/ConfigBasic.js`) || fs.existsSync(`./ConfigBasic.js`)) {
      Config = require(`${commander.configPath || '.'}/ConfigBasic.js`)
      mylog.info('ConfigBasic loaded')
    }
    if (fs.existsSync(`${commander.configPath}/ConfigCustom.js`) || fs.existsSync(`./ConfigCustom.js`)) { // 如果存在，覆盖掉 ConfigBasic 里的默认参数
      Config = deepmerge(Config, require(`${commander.configPath || '.'}/ConfigCustom.js`)) // 注意，objectMerge后，产生了一个新的对象，而不是在原来的Config里添加
      mylog.info('ConfigCustom loaded')
    }
    if (fs.existsSync(`${commander.configPath}/ConfigSecret.js`) || fs.existsSync(`./ConfigSecret.js`)) { // 如果存在，覆盖掉 ConfigBasic 里的默认参数
      Config = deepmerge(Config, require(`${commander.configPath || '.'}/ConfigSecret.js`)) // 注意，objectMerge后，产生了一个新的对象，而不是在原来的Config里添加
      mylog.info('ConfigSecret loaded')
    }
  } catch (err) {
    mylog.error('Loading config files failed: ' + err.message)
    process.exit()
  }

  // 载入命令行参数
  commander
    .version(Config.VERSION, '-v, --version') // 默认是 -V。如果要 -v，就要加 '-v --version'
    .option('-S, --configPath <src>', 'path of configfiles')
    .option('-c, --consensus <type>', 'Consensus type: Pot|Pow|Alone. Default to ' + Config.consensus)
    .option('--dbType <type>', 'Database type: mysql|sqlite. Default to ' + Config.dbType)
    .option('--dbName <name>', 'Database name')
    .option('--swarm <type>', 'p2p swarm protocol')
    .option('-e, --epoch <epoch>', 'Genesis epoch in ISO format string or prevHour|nextMin|now')
    .option('-H, --host <host>', 'Host ip or domain name. Default to ' + Config.host)
    .option('-n, --netType <net>', 'Network: devnet|testnet|mainnet. Default to ' + Config.netType)
    .option('-o, --ownerSecword <secword>', 'Node owner\'s secword or random|dev1')
    .option('-P, --protocol <protocol>', 'Server protocol: http|https|httpall. Default to ' + Config.protocol)
    .option('-p, --port <port>', 'Server port number. Default to ' + Config.port ? Config.port : '80|443 for http|https')
    .option('-l, --link <link>', 'Network Nconnection: http|udp')
    .option('-s, --seedSet <seedSet>', 'Seed list such as \'["http://ip_or_dn:port"]\' or "noseed" to disable seeding')
    .option('-t, --thread <thread>', 'Thread mode: single|cluster. Default to ' + Config.thread)
    .option('--sslCert <cert>', 'SSL certificate file. Default to ' + Config.sslCert)
    .option('--sslKey <key>', 'SSL private key file. Default to ' + Config.sslKey)
    .option('--sslCA <ca>', 'SSL ca bundle file')
    .option('-r, --redisIndex <index>', 'redis db index')
    .parse(process.argv)

  // 把命令行参数 合并入配置。
  Config.consensus = commander.consensus || Config.consensus
  Config.dbType = commander.dbType || Config.dbType
  Config.dbName = commander.dbName || Config.dbName
  Config.host = commander.host || Config.host || require('fon.base/Network.js').getMyIp() // // 本节点的从外部可访问的 IP or Hostname，不能是 127.0.0.1 或 localhost
  Config.netType = commander.netType || Config.netType
  Config.ownerSecword = commander.ownerSecword || Config.ownerSecword
  Config.protocol = commander.protocol || Config.protocol
  Config.port = parseInt(commander.port) || parseInt(Config.port) || (Config.protocol === 'http' ? 80 : Config.protocol === 'https' ? 443 : undefined) // 端口默认为http 80, https 443, 或80|443(httpall)
  Config.link = commander.link || Config.link
  Config.seedSet = commander.seedSet === 'noseed' ? [] : commander.seedSet
    ? deepmerge(JSON.parse(commander.seedSet), deepmerge(Config.seedSet, Config.NET_SEEDSET[Config.netType]))
    : deepmerge(Config.seedSet, Config.NET_SEEDSET[Config.netType])
  Config.sslCert = commander.sslCert || Config.sslCert
  Config.sslKey = commander.sslKey || Config.sslKey
  Config.sslCA = commander.sslCA || Config.sslCA
  Config.thread = commander.thread || Config.thread
  Config.redisIndex = commander.redisIndex || Config.redisIndex
  Config.epoch = commander.epoch || Config.GENESIS_BLOCK[Config.netType].timestamp

  try {
    Config.dbName = `${Config.dbName}-${Config.consensus}-${Config.netType}.${Config.dbType}`
    Config.INITIAL_ACCOUNT = Config.INITIAL_ACCOUNT[Config.netType]
    Config.GENESIS_MESSAGE = Config.GENESIS_BLOCK[Config.netType].message
    Config.GENESIS_EPOCH = require('./modules/util/Date.js').time2epoch(Config.epoch)
    if (!Config.GENESIS_EPOCH) {
      mylog.error(`Error: Genesis epoch is invalid! Please set a valid date string or nextMin|prevHour|now`)
      process.exit()
    }
    // 配置 ownerSecword
    if (Config.netType === 'devnet') {
      if (/^dev\d+$/.test(Config.ownerSecword) && Config.INITIAL_ACCOUNT[Config.ownerSecword.slice(3)]) {
      // 允许开发者在命令行里 -o 'dev1' 来指定使用预设的开发者账号
        Config.ownerSecword = Config.INITIAL_ACCOUNT[Config.ownerSecword.slice(3)].secword
        mylog.info(`current node for devnet is instructed to use secword "${Config.ownerSecword}"`)
      } else if (!Config.ownerSecword) {
      // 如果没有设置secword并且在devnet，就用devnet的初始账号，使得不需要任何参数就能运行。
        Config.ownerSecword = Config.INITIAL_ACCOUNT[0].secword
        mylog.info(`current node for devnet is using default dev0 secword "${Config.ownerSecword}"`)
      }
    }
    if (Config.ownerSecword === 'random') {
      Config.ownerSecword = Crypto.randomSecword()
      mylog.info(`random secword is used: ${Config.ownerSecword}`)
    }
    if (Config.netType !== 'devnet' && Config.ownerSecword === Config.INITIAL_ACCOUNT[0].secword) {
      mylog.error(`Public devnet secword cannot be used for other networks. Please setup your own private secword.`)
      mylog.error('非开发网禁止使用已知的开发网初始账号')
      process.exit()
    }
    if (!Crypto.isSecword(Config.ownerSecword)) {
      mylog.error(`Invalid secword: "${Config.ownerSecword}". Please setup a secword in config file or command line.`)
      process.exit()
    }

    mylog.info('Configuration is ready')
    mylog.info(`  consensus=====${Config.consensus}`)
    mylog.info(`  netType=====${Config.netType}`)
    mylog.info(`  dbType=====${Config.dbType}`)
    mylog.info(`  dbName=====${Config.dbName}`)
    mylog.info(`  protocol=====${Config.protocol}`)
    mylog.info(`  host=====${Config.host}`)
    mylog.info(`  port=====${Config.port}`)
    mylog.info(`  seedSet=====${JSON.stringify(Config.seedSet)}`)
    mylog.info(`  GENESIS_EPOCH=====${Config.GENESIS_EPOCH.toJSON()}`)
    mylog.info(`  INITIAL_ACCOUNT=====${JSON.stringify(Config.INITIAL_ACCOUNT)}`)
    mylog.info(`  ownerSecword=====${Config.ownerSecword}`)

    return Config
  } catch (error) {
    mylog.error('Error: Invalid Config File or Config Commander!')
    process.exit()
  }
}

async function initSingle () {
  global.wo = {} // wo 代表 world或‘我’，是当前的命名空间，把各种类都放在这里，防止和其他库的冲突。
  wo.Config = config() // 依次载入系统默认配置、用户配置文件、命令行参数
  wo.Crypto = require('tic.crypto')

  mylog.info('Initializing database......')
  wo.Data = await require('fon.data')(wo.Config.dbType)._init(wo.Config.dbName)

  mylog.info('Loading classes and Creating tables......')
  wo.Ling = require('fon.ling')

  wo.Store = await require('./modules/util/Store.js')('redis', { db: wo.Config.redisIndex })._init()
  wo.Peer = await require('./modules/peer/index.js')(wo.Config.swarm)._init()
  wo.Account = require('./modules/Token/Account.js')
  wo.Action = await require('./modules/Action/Action.js')._init()
  wo.ActTransfer = require('./modules/Action/ActTransfer.js')
  wo.ActStorage = require('./modules/Action/ActStorage.js')
  wo.ActMultisig = require('./modules/Action/ActMultisig.js')
  wo.Tac = await require('./modules/Token/Tac.js')._init()
  wo.ActTac = require('./modules/Action/ActTac.js')
  wo.Bancor = require('./modules/Token/Bancor.js')._init()
  wo.Block = await require('./modules/Block/index.js')(wo.Config.consensus)._init()
  mylog.info('Initializing chain............')
  wo.Chain = await require('./modules/Chain/Chain.js')._init()
  wo.Consensus = await require('./modules/Consensus/index.js')(wo.Config.consensus)._init()

  return wo
}

async function initMaster (worker) {
  global.mylog = require('fon.base/Logger.js')({ root: 'data.log', file: 'tic.master.log' }) // 简写 console.log，为了少敲几个字母

  global.wo = {} // wo 代表 world或‘我’，是当前的命名空间，把各种类都放在这里，防止和其他库的冲突。
  // 通过 JSON.parse(JSON.stringify(this.actionHashList)) 来取代 extend，彻底解除对wo.Tool依赖 wo.Tool = new (require('fon.base/Egg.js'))()
  wo.Config = config() // 依次载入系统默认配置、用户配置文件、命令行参数
  wo.Crypto = require('tic.crypto')

  wo.Ling = require('fon.ling')

  wo.EventBus = require('./modules/util/EventBus.js')(worker).mount(worker)
  wo.Peer = await require('./modules/peer/index.js')('proxy')
  wo.Store = await require('./modules/util/Store.js')('redis') // 必须指定数据库,另外不能_init(),否则会覆盖子进程已经设定好的内容
  wo.Block = require('./modules/Block/index.js')(wo.Config.consensus)
  wo.Chain = require('./modules/Chain/index.js')
  mylog.info('初始化共识模块')
  wo.Consensus = await require('./modules/Consensus/index.js')(wo.Config.consensus)._init()
}

async function initWorker () {
  global.mylog = require('fon.base/Logger.js')({ root: 'data.log', file: 'tic.worker.log' }) // 简写 console.log，为了少敲几个字母

  global.wo = {} // wo 代表 world或‘我’，是当前的命名空间，把各种类都放在这里，防止和其他库的冲突。
  // 通过 JSON.parse(JSON.stringify(this.actionHashList)) 来取代 extend，彻底解除对wo.Tool依赖 wo.Tool = new (require('fon.base/Egg.js'))()
  wo.Config = config() // 依次载入系统默认配置、用户配置文件、命令行参数
  wo.Crypto = require('tic.crypto')

  mylog.info('Initializing database......')
  wo.Data = await require('fon.data')(wo.Config.dbType)._init(wo.Config.dbName)

  mylog.info('Loading classes and Creating tables......')
  wo.Ling = require('fon.ling')
  // wo.Session=await require('fon.ling/Session.js')._init() // 目前不使用。

  wo.EventBus = require('./modules/util/EventBus.js')(process)
  wo.Store = await require('./modules/util/Store.js')('redis', { db: wo.Config.redisIndex })._init()
  wo.Peer = await require('./modules/peer/index.js')('simple')._init()
  wo.Account = await require('./modules/Token/Account.js')
  wo.Action = await require('./modules/Action/Action.js')._init()
  wo.Tac = await require('./modules/Token/Tac.js')._init()
  wo.ActTransfer = require('./modules/Action/ActTransfer.js')
  wo.ActStorage = require('./modules/Action/ActStorage.js')
  wo.ActMultisig = require('./modules/Action/ActMultisig.js')
  wo.ActTac = require('./modules/Action/ActTac.js')
  wo.Bancor = require('./modules/Token/Bancor.js')._init()
  wo.Block = await require('./modules/Block/index.js')(wo.Config.consensus)._init()
  wo.Consensus = require('./modules/Consensus/index.js')('proxy', wo.Config.consensus)

  mylog.info('Initializing chain............')
  wo.Chain = await require('./modules/Chain/Chain.js')._init()
  return 0
}

function initServer () { // 配置并启动 Web 服务
  mylog.info('★★★★★★★★ Starting Server......')

  const Express = require('express')
  const Cors = require('cors')
  const Morgan = require('morgan')
  const MethodOverride = require('method-override')
  const CookieParser = require('cookie-parser')
  const BodyParser = require('body-parser')
  const ErrorHandler = require('errorhandler')
  const Compression = require('compression')

  const server = Express()

  /** * 通用中间件 ***/

  server.use(Morgan(server.get('env') === 'development' ? 'dev' : 'combined')) // , {stream:require('fs').createWriteStream(path.join(__dirname+'/data.log', 'http.log'), {flags: 'a', defaultEncoding: 'utf8'})})) // format: combined, common, dev, short, tiny.
  server.use(MethodOverride())
  server.use(CookieParser())
  server.use(BodyParser.json({
    limit: '50mb',
    extended: true
  })) // 用于过滤 POST 参数
  server.use(Cors())
  server.use(Compression())

  server.use(Express.static(path.join(__dirname, '../node.console.web/dist'), { index: 'index.html' })) // 可以指定到 node应用之外的目录上。windows里要把 \ 换成 /。

  /** * 路由中间件 ***/

  server.all('/:_api/:_who/:_act', async function (ask, reply) {
    // http://address:port/api/Block/getBlockList

    /* 把前端传来的json参数，重新解码成对象 */
    var option = {}
    for (let key in ask.query) { // GET 方法传来的参数
      option[key] = wo.Ling.json2obj(ask.query[key])
      mylog.info(key + ' : ' + option[key])
    }
    for (let key in ask.body) { // POST 方法传来的参数
      option[key] = wo.Ling.json2obj(ask.body[key])
    }
    /// //////// authentication ///////////////////
    option._req = ask

    reply.setHeader('charset', 'utf-8')
    // reply.setHeader('Access-Control-Allow-Origin', '*') // 用了 Cors中间件，就不需要手工再设置了。
    // reply.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE')
    reply.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type')

    let _who = ask.params._who
    let _act = ask.params._act
    let _api = ask.params._api

    try {
      if (wo[_who] && wo[_who][_api] && wo[_who][_api].hasOwnProperty(_act) && typeof wo[_who][_api][_act] === 'function') {
        var result = await wo[_who][_api][_act](option)
        reply.json(result) // 似乎 json(...) 相当于 send(JSON.stringify(...))。如果json(undefined或nothing)会什么也不输出给前端，可能导致前端默默出错；json(null/NaN/Infinity)会输出null给前端（因为JSON.stringify(NaN/Infinity)返回"null"）。
      } else {
        reply.json(null)
      }
    } catch (exception) {
      mylog.info(exception)
      reply.json(null)
    }
  })

  server.all('*', function (ask, reply) { /* 错误的API调用进入这里。 */
    reply.json(null)
  })

  // 错误处理中间件应当在路由加载之后才能加载
  if (server.get('env') === 'development') {
    server.use(ErrorHandler({
      dumpExceptions: true,
      showStack: true
    }))
  }
  /** * 启动 Web 服务 ***/
  let webServer
  if (wo.Config.protocol === 'http') { // 如果在本地localhost做开发，就启用 http。注意，从https网页，不能调用http的socket.io。Chrome/Firefox都报错：Mixed Content: The page at 'https://localhost/yuncai/' was loaded over HTTPS, but requested an insecure XMLHttpRequest endpoint 'http://localhost:6327/socket.io/?EIO=3&transport=polling&t=LoRcACR'. This request has been blocked; the content must be served over HTTPS.
    webServer = require('http').createServer(server)
    webServer.listen(wo.Config.port, function () {
      mylog.info('Server listening on %s://%s:%d for %s environment', wo.Config.protocol, wo.Config.host, wo.Config.port, server.settings.env)
    })
  } else if (wo.Config.protocol === 'https') { // 启用 https。从 http或https 网页访问 https的ticnode/socket 都可以，socket.io 内容也是一致的。
    webServer = require('https').createServer({
      key: fs.readFileSync(wo.Config.sslKey),
      cert: fs.readFileSync(wo.Config.sslCert) // , ca: [ fs.readFileSync(wo.Config.sslCA) ] // only for self-signed certificate: https://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener
    }, server)
    webServer.listen(wo.Config.port, function () {
      mylog.info('Server listening on %s://%s:%d for %s environment', wo.Config.protocol, wo.Config.host, wo.Config.port, server.settings.env)
    })
  } else if (wo.Config.protocol === 'httpall') { // 同时启用 http 和 https
    let portHttp = wo.Config.port ? wo.Config.port : 80 // 如果port参数已设置，使用它；否则默认为80
    webServer = require('http').createServer(server)
    webServer.listen(portHttp, function () {
      mylog.info('Server listening on %s://%s:%d for %s environment', wo.Config.protocol, wo.Config.host, portHttp, server.settings.env)
    })

    let portHttps = (wo.Config.port && wo.Config.port !== 80) ? wo.Config.port + 443 : 443 // 如果port参数已设置，使用它+443；否则默认为443
    let httpsServer = require('https').createServer({
      key: fs.readFileSync(wo.Config.sslKey),
      cert: fs.readFileSync(wo.Config.sslCert) // , ca: [ fs.readFileSync(wo.Config.sslCA) ] // only for self-signed certificate: https://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener
    }, server)
    httpsServer.listen(portHttps, function () {
      mylog.info('Server listening on %s://%s:%d for %s environment', wo.Config.protocol, wo.Config.host, portHttps, server.settings.env)
    })
  }

  wo.Socket = socket.listen(webServer)
  wo.Socket.sockets.on('connection', (socket) => {
    mylog.info('New Client Connected')
    socket.on('call', async (data, echo) => {
      if (data.who && data.act && echo && typeof echo === 'function') {
        if (wo[data.who] && wo[data.who]['api'] && wo[data.who]['api'][data.act] && typeof wo[data.who]['api'][data.act] === 'function') {
          let res = await wo[data.who]['api'][data.act](data.param)
          return echo(res)
        } else echo({ Error: 'Invalid API' })
      }
    })
  })
  return webServer
}

(async function start () {
  if (config().thread === 'single') {
    // 单进程模式启动
    mylog.info('单进程模式启动......')
    await initSingle()
    initServer()
    // 启动区块链部署程序
    try {
      (require('./deployer/util.js').execAsync)('node ./deployer/listener.js')
    } catch (error) {
      mylog.warn(`区块链部署程序启动失败`)
    }
  } else {
    // cluster模式启动
    if (cluster.isMaster) {
      cluster.fork()
      cluster.on('message', async (worker, message) => {
        if (message.code === 200) {
          mylog.warn(`[Master] 主程序初始化完毕，启动共识模块......`)
          await initMaster(worker)
          return 0
        }
      })
    } else {
      /** BlockChain以及RPC服务进程 */
      await initWorker()
      initServer()
      wo.EventBus.send(200, '链进程初始化完毕')
      // 启动区块链部署程序
      try {
        (require('./deployer/util.js').execAsync)('node ./deployer/listener.js')
      } catch (error) {
        mylog.warn(`区块链部署程序启动失败`)
      }
    }
  }
})()
