'use strict'
const fs = require('fs')
const cluster = require('cluster')
const socket = require('socket.io')
const mylog = require('fon.base/Logger.js')({root:'data.log'}) // 简写 console.log，为了少敲几个字母

function config() {
  // 配置参数（按优先级从低到高）：
  // ConfigSys: 系统常量（全大写） 以及 默认参数（小写开头驼峰式）
  // ConfigUser: 用户或应用自定义参数。本文件不应纳入版本管理。
  // ConfigSecret: 机密参数，例如哈希盐，webtoken密钥，等等。本文件绝对不能纳入版本管理。
  // 命令行参数
  const commander = require('commander')
  const deepmerge = require('deepmerge')

  var Config = {}

  // 载入命令行参数
  commander
    .version(Config.VERSION, '-v, --version') // 默认是 -V。如果要 -v，就要加 '-v --version'
    .option('-S, --configPath <src>', 'path of configfiles')
    .option('-c, --consensus <type>', 'Consensus type: Pot|Pow|Alone, default to ' + Config.consensus)
    .option('--dbType <type>', 'Database type mysql|sqlite')
    .option('--dbName <name>', 'Database name')
    .option('-H, --host <host>', 'host ip or domain name')
    .option('-n, --netType <net>', 'devnet/testnet/mainnet')
    .option('-o, --ownerSecword <secword>', 'Node owner\'s secword')
    .option('-P, --protocol <protocol>', 'Server protocol: http|https|httpall, default ' + Config.protocol)
    .option('-p, --port <port>', 'Server port, default' + Config.port)
    .option('-l, --link <link>', 'P2P protocol: http|udp')
    .option('-s, --seedSet <seedSet>', 'Peers array in JSON, such as \'["http://ip_or_dn:port"]\'')
    .option('--sslCert <cert>', 'SSL cert file')
    .option('--sslKey <key>', 'SSL privkey file')
    .option('--sslCA <ca>', 'SSL ca bundle file')
    .option('-r, --redisIndex <index>', 'redis db index')
    .parse(process.argv)

  // 读取配置文件
  try {
    if (fs.existsSync(`${commander.configPath}/ConfigSys.js`) || fs.existsSync(`./ConfigSys.js`)) {
      Config = require(`${commander.configPath || '.'}/ConfigSys.js`)
      mylog.info('ConfigSys loaded')
    }
    if (fs.existsSync(`${commander.configPath}/ConfigUser.js`) || fs.existsSync(`./ConfigSys.js`)) { // 如果存在，覆盖掉 ConfigSys 里的默认参数
      Config = deepmerge(Config, require(`${commander.configPath || '.'}/ConfigUser.js`)) // 注意，objectMerge后，产生了一个新的对象，而不是在原来的Config里添加
      mylog.info('ConfigUser loaded')
    }
  } catch (err) {
    mylog.error('Loading config files failed: ' + err.message)
    process.exit()
  }

  // 把命令行参数 合并入配置。
  Config.consensus = commander.consensus || Config.consensus || 'pot'
  mylog.info('Consensus used: ', Config.consensus)

  Config.dbType = commander.dbType || Config.dbType
  Config.dbName = commander.dbName || Config.dbName
  Config.host = commander.host || Config.host || require('fon.base/Network.js').getMyIp() // // 本节点的从外部可访问的 IP or Hostname，不能是 127.0.0.1 或 localhost
  Config.netType = commander.netType || Config.netType
  Config.ownerSecword = commander.ownerSecword || Config.ownerSecword
  Config.protocol = commander.protocol || Config.protocol
  Config.port = parseInt(commander.port) || parseInt(Config.port) || (Config.protocol === 'http' ? 8888 : Config.protocol === 'https' ? 8888 : undefined) // 端口默认为8888(http,https), 或80|443(httpall)
  Config.link = commander.link || Config.link
  Config.seedSet = commander.seedSet ? JSON.parse(commander.seedSet) : Config.seedSet
  Config.sslCert = commander.sslCert || Config.sslCert
  Config.sslKey = commander.sslKey || Config.sslKey
  Config.sslCA = commander.sslCA || Config.sslCA
  Config.redisIndex = commander.redisIndex || Config.redisIndex
  try {
    Config.GENESIS_EPOCHE = Config.GENESIS_BLOCK[Config.netType].timestamp
    Config.GENESIS_MESSAGE = Config.GENESIS_BLOCK[Config.netType].message
    Config.INITIAL_ACCOUNT = Config.INITIAL_ACCOUNT[Config.netType]
    Config.dbName=`${Config.dbName}-${Config.consensus}-${Config.netType}.${Config.dbType}`
    if (Config.netType === 'devnet') {
      Config.GENESIS_EPOCHE = require('fon.base/Date.js').time2epoche({ type: 'prevHour' }) // nextMin: 下一分钟（单机测试）， prevHour: 前一小时（多机测试），或 new Date('2018-07-03T10:15:00.000Z') // 为了方便开发，暂不使用固定的创世时间，而是生成当前时刻之后的第一个0秒，作为创世时间
    }
  
    mylog.info('Configuration is ready.')
    return Config
  } catch (error) {
    mylog.error("Error: Invalid Config File or Config Commander!")
    process.exit()
  }
}

async function masterInit(worker) {
  global.mylog = require('fon.base/Logger.js')({root:'data.log'}) // 简写 console.log，为了少敲几个字母

  global.wo = {} // wo 代表 world或‘我’，是当前的命名空间，把各种类都放在这里，防止和其他库的冲突。
// 通过 JSON.parse(JSON.stringify(this.actionHashList)) 来取代 extend，彻底解除对wo.Tool依赖 wo.Tool = new (require('fon.base/Egg.js'))()
  wo.Config = config() // 依次载入系统默认配置、用户配置文件、命令行参数
  wo.Crypto = require('tic.crypto')
  if (!wo.Crypto.isSecword(wo.Config.ownerSecword)){
    mylog.warn('Invalid secword! Please setup a secword in ConfigSecret.js')
    process.exit()
  }

  wo.Ling = require('fon.ling')

  wo.Block = require('./modules/Block/index.js')(wo.Config.consensus)
  wo.Peer = await require('./modules/P2P/index.js')
  wo.Store = await require('./modules/util/Store.js')('redis') //  必须指定数据库,另外不能_init(),否则会覆盖子进程已经设定好的内容
  wo.EventBus = require('./modules/util/EventBus.js')(worker).mount(worker)
  wo.Chain = require('./modules/Chain/index.js')
  mylog.info('初始化共识模块')
  wo.Consensus = await require('./modules/Consensus/index.js')(wo.Config.consensus)._init()
}

async function workerInit() {
  global.mylog = require('fon.base/Logger.js')({root:'data.log'}) // 简写 console.log，为了少敲几个字母

  global.wo = {} // wo 代表 world或‘我’，是当前的命名空间，把各种类都放在这里，防止和其他库的冲突。
// 通过 JSON.parse(JSON.stringify(this.actionHashList)) 来取代 extend，彻底解除对wo.Tool依赖 wo.Tool = new (require('fon.base/Egg.js'))()
  wo.Config = config() // 依次载入系统默认配置、用户配置文件、命令行参数
  wo.Crypto = require('tic.crypto')
  if (!wo.Crypto.isSecword(wo.Config.ownerSecword)){
    mylog.error('Invalid secword! Please setup a secword in ConfigSecret.js')
    process.exit()
  }

  mylog.info('Initializing database......')
  wo.Data = await require('fon.data')(wo.Config.dbType)._init(wo.Config.dbName)

  mylog.info('Loading classes and Creating tables......')
  wo.Ling = require('fon.ling')
  // wo.Session=await require('fon.ling/Session.js')._init() // 目前不使用。

  wo.Account = await require('./modules/Token/Account.js')
  wo.Action = await require('./modules/Action/Action.js')._init()
  wo.Tac = await require('./modules/Token/Tac.js')._init()
  wo.ActTransfer = require('./modules/Action/ActTransfer.js')
  wo.ActStorage = require('./modules/Action/ActStorage.js')
  wo.ActMultisig = require('./modules/Action/ActMultisig.js')
  wo.ActTac = require('./modules/Action/ActTac.js')
  wo.Bancor = require('./modules/Token/Bancor.js')._init()
  wo.Block = await require('./modules/Block/index.js')(wo.Config.consensus)._init()
  wo.Store = await require('./modules/util/Store.js')('redis', { db: wo.Config.redisIndex })._init()
  wo.Peer = await require('./modules/P2P/index.js')
  wo.P2P = await require('./modules/P2P/P2P.js')._init()
  wo.EventBus = require('./modules/util/EventBus.js')(process)
  wo.Consensus = require('./modules/Consensus/index.js')('proxy', wo.Config.consensus)

  mylog.info('Initializing chain............')
  wo.Chain = await require('./modules/Chain/Chain.js')._init()
  return 0
}

function serverInit() { // 配置并启动 Web 服务

  mylog.info("★★★★★★★★ Starting Server......")

  const Express = require('express')
  const Cors = require('cors')
  const Morgan = require('morgan')
  const MethodOverride = require('method-override')
  const CookieParser = require('cookie-parser')
  const BodyParser = require('body-parser')
  const ErrorHandler = require('errorhandler')

  const server = Express()

  /*** 通用中间件 ***/

  server.use(Morgan('development' === server.get('env') ? 'dev' : 'combined')) // , {stream:require('fs').createWriteStream(path.join(__dirname+'/data.log', 'http.log'), {flags: 'a', defaultEncoding: 'utf8'})})) // format: combined, common, dev, short, tiny.  发现 defaultEncoding 并不起作用。
  server.use(MethodOverride())
  server.use(CookieParser())
  server.use(BodyParser.json({
    limit: '50mb'
  })) // 用于过滤 POST 参数
  server.use(BodyParser.urlencoded({
    limit: '50mb',
    extended: true
  }))
  server.use(Cors())
  server.use(Express.static(__dirname + '/Web')) // 可以指定到 node应用之外的目录上。windows里要把 \ 换成 /。

  /*** 路由中间件 ***/

  server.all('/:_api/:_who/:_act', async function (ask, reply) {
    // http://address:port/api/Block/getBlockList

    /* 把前端传来的json参数，重新解码成对象 */
    var option = {}
    for (let key in ask.query) { // GET 方法传来的参数
      option[key] = wo.Ling.json2obj(ask.query[key])
      mylog.info(key + " : " + option[key])
    }
    for (let key in ask.body) { // POST 方法传来的参数
      option[key] = wo.Ling.json2obj(ask.body[key])
    }
    /////////// authentication ///////////////////
    option._req = ask
    async function normalize(result) { // 有的实例的normalize 需要当前用户信息，比如 Message 要根据当前用户判断 vote 。所以这个函数定义在这里，把含有当前用户信息的option给它
      if (result && result instanceof wo.Ling) { // 是 Ling 元素。注意，字符串也有 normalize 方法，在WSL16+node9.4里会报错“RangeError: The normalization form should be one of NFC, NFD, NFKC, NFKD.”，所以必须判断是Ling，而不能只判断具有normalize方法。
        await result.normalize(option) // 有的 normalize 需要 option，例如检查当前用户是否投票了某消息
      } else if (result && typeof result === 'object') { // 是其他对象或数组
        for (var i in result) {
          await normalize(result[i])
        }
      } else if (typeof result === 'undefined') { // reply.json(undefined 或 nothing) 会导致什么都不输出给前端，可能导致前端默默出错。因此这时返回null。
        result = null
      }
      return result
    }

    reply.setHeader('charset', 'utf-8')
    reply.setHeader('Access-Control-Allow-Origin', '*')
    reply.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE')
    reply.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type')

    let _who = ask.params._who
    let _act = ask.params._act
    let _api = ask.params._api

    try {
      if (wo[_who] && wo[_who][_api] && wo[_who][_api].hasOwnProperty(_act) && typeof wo[_who][_api][_act] === 'function') {
        var result = await wo[_who][_api][_act](option)
        reply.json(await normalize(result)) // 似乎 json(...) 相当于 send(JSON.stringify(...))。如果json(undefined或nothing)会什么也不输出给前端，可能导致前端默默出错；json(null/NaN/Infinity)会输出null给前端（因为JSON.stringify(NaN/Infinity)返回"null"）。
      } else {
        reply.json(null)
      }
    } catch (exception) {
      mylog.info(exception)
      reply.json(null)
    }

  })

  server.all('*', function (ask, reply) { /* 错误的API调用进入这里。*/
    reply.json(null)
  })

  // 错误处理中间件应当在路由加载之后才能加载
  if ('development' === server.get('env')) {
    server.use(ErrorHandler({
      dumpExceptions: true,
      showStack: true
    }))
  }
  /*** 启动 Web 服务 ***/
  let webServer
  if ('http' === wo.Config.protocol) { // 如果在本地localhost做开发，就启用 http。注意，从https网页，不能调用http的socket.io。Chrome/Firefox都报错：Mixed Content: The page at 'https://localhost/yuncai/' was loaded over HTTPS, but requested an insecure XMLHttpRequest endpoint 'http://localhost:6327/socket.io/?EIO=3&transport=polling&t=LoRcACR'. This request has been blocked; the content must be served over HTTPS.
    webServer = require('http').createServer(server)
    webServer.listen(wo.Config.port, function (err) {
      mylog.info('Server listening on %s://%s:%d for %s environment', wo.Config.protocol, wo.Config.host, wo.Config.port, server.settings.env)
    })
  } else if ('https' === wo.Config.protocol) { // 启用 https。从 http或https 网页访问 https的ticnode/socket 都可以，socket.io 内容也是一致的。
    webServer = require('https').createServer({
      key: fs.readFileSync(wo.Config.sslKey),
      cert: fs.readFileSync(wo.Config.sslCert) // , ca: [ fs.readFileSync(wo.Config.sslCA) ] // only for self-signed certificate: https://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener
    }, server)
    webServer.listen(wo.Config.port, function (err) {
      mylog.info('Server listening on %s://%s:%d for %s environment', wo.Config.protocol, wo.Config.host, wo.Config.port, server.settings.env)
    })
  } else if ('httpall' === wo.Config.protocol) { // 同时启用 http 和 https
    let portHttp = wo.Config.port ? wo.Config.port : 80 // 如果port参数已设置，使用它；否则默认为80
    webServer = require('http').createServer(server)
    webServer.listen(portHttp, function (err) {
      mylog.info('Server listening on %s://%s:%d for %s environment', wo.Config.protocol, wo.Config.host, portHttp, server.settings.env)
    })

    let portHttps = (wo.Config.port && wo.Config.port !== 80) ? wo.Config.port + 443 : 443 // 如果port参数已设置，使用它+443；否则默认为443
    let httpsServer = require('https').createServer({
      key: fs.readFileSync(wo.Config.sslKey),
      cert: fs.readFileSync(wo.Config.sslCert) // , ca: [ fs.readFileSync(wo.Config.sslCA) ] // only for self-signed certificate: https://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener
    }, server)
    httpsServer.listen(portHttps, function (err) {
      mylog.info('Server listening on %s://%s:%d for %s environment', wo.Config.protocol, wo.Config.host, portHttps, server.settings.env)
    })
  }
  return webServer
}

(async function Start() {
  if (cluster.isMaster) {
    let worker = cluster.fork()
    cluster.once('message', async (worker, message) => {
      if(message.code == 200) {
        mylog.warn(`[Master] 主程序初始化完毕，启动共识模块......`)
        await masterInit(worker)
        return 0
      }
    })

    cluster.on('exit', function (worker, code, signal) {
      mylog.error('worker ' + worker.process.pid + ' died, Restarting')
      var worker = cluster.fork()
      cluster.once('message', async (worker, message) => {
        if (message.code == 200) {
            mylog.warn(`[Master] 主程序初始化完毕，启动共识模块......`)
            await masterInit(worker)
            return 0
        }
      })
    })
  }
  else {
    /**BlockChain以及RPC服务进程 */
    await workerInit()
    let webServer = serverInit()
    wo.Socket = socket.listen(webServer)
    wo.Socket.sockets.on("open",()=>{
      mylog.info('Socket started')
    })
    wo.Socket.sockets.on('connection',(socket)=>{
      // 处理操作
      mylog.info('new client connected')
      socket.send('hello')
    })
    wo.EventBus.send(200, "链进程初始化完毕")
    //启动区块链部署程序
    try {
      (require('./deployer/util.js').execAsync)('node ./deployer/listener.js')
    } catch (error) {
      mylog.warn(`区块链部署程序启动失败`)
    }
  }
})()