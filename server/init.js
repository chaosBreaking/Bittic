'use strict'
const fs = require('fs');
const cluster = require('cluster');
const socket = require('socket.io');
const mylog = require('./util/Logger.js');

function config() {
  // 配置参数（按优先级从低到高）：
  // ConfigSys: 系统常量（全大写） 以及 默认参数（小写开头驼峰式）
  // ConfigUser: 用户或应用自定义参数。本文件不应纳入版本管理。
  // ConfigSecret: 机密参数，例如哈希盐，webtoken密钥，等等。本文件绝对不能纳入版本管理。
  // 命令行参数
  const commander = require('commander')
  const deepmerge = require('deepmerge')

  var Config = {}

  // 读取配置文件
  try {
    if (fs.existsSync('./ConfigSys.js')) {
      Config = require('./ConfigSys.js')
      mylog.info('ConfigSys loaded')
    }
    if (fs.existsSync('./ConfigUser.js')) { // 如果存在，覆盖掉 ConfigSys 里的默认参数
      Config = deepmerge(Config, require('./ConfigUser.js')) // 注意，objectMerge后，产生了一个新的对象，而不是在原来的Config里添加
      mylog.info('ConfigUser loaded')
    }
    if (fs.existsSync('./ConfigSecret.js')) { // 如果存在，覆盖掉 ConfigSys 和 ConfigUser 里的参数
      Config = deepmerge(Config, require('./ConfigSecret.js'))
      mylog.info('ConfigSecret loaded')
    }
  } catch (err) {
    mylog.error('Loading config files failed: ' + err.message)
  }

  // 载入命令行参数
  commander
    .version(Config.VERSION, '-v, --version') // 默认是 -V。如果要 -v，就要加 '-v --version'
    .option('-c, --consensus <type>', 'Consensus type: Pot (default), Pow, Alone, etc.')
    .option('--dbType <type>', 'Database type mysql|sqlite')
    .option('--dbName <name>', 'Database name')
    .option('-H, --host <host>', 'host ip or domain name')
    .option('-n, --netType <net>', 'devnet/testnet/mainnet')
    .option('-o, --ownerSecword <secword>', 'Node owner\'s secword')
    .option('-P, --protocol <protocol>', 'Server protocol http|https|httpall, default ' + Config.protocol)
    .option('-p, --port <port>', 'Server port, default' + Config.port)
    .option('-l, --link <link>', 'P2P protocol: http|udp')
    .option('-s, --seedSet <seedSet>', 'Peers array in JSON, such as \'["http://ip_or_dn:port"]\'')
    .option('--sslCert <cert>', 'SSL cert file')
    .option('--sslKey <key>', 'SSL privkey file')
    .option('--sslCA <ca>', 'SSL ca bundle file')
    .parse(process.argv)

  // 把命令行参数 合并入配置。
  Config.consensus = 'Cons' + (commander.consensus || Config.consensus || 'Pot')
  mylog.info('Consensus used: ', Config.consensus)

  Config.dbType = commander.dbType || Config.dbType
  Config.dbName = commander.dbName || Config.dbName
  Config.host = commander.host || Config.host || require('./util/Network.js').getMyIp() // // 本节点的从外部可访问的 IP or Hostname，不能是 127.0.0.1 或 localhost
  Config.netType = commander.netType || Config.netType
  Config.ownerSecword = commander.ownerSecword || Config.ownerSecword
  Config.protocol = commander.protocol || Config.protocol
  Config.port = parseInt(commander.port) || parseInt(Config.port) || (Config.protocol === 'http' ? 6842 : Config.protocol === 'https' ? 6842 : undefined) // 端口默认为6842(http,https), 或80|443(httpall)
  Config.link = commander.link || Config.link
  Config.seedSet = commander.seedSet ? JSON.parse(commander.seedSet) : Config.seedSet
  Config.sslCert = commander.sslCert || Config.sslCert
  Config.sslKey = commander.sslKey || Config.sslKey
  Config.sslCA = commander.sslCA || Config.sslCA

  switch (Config.netType) {
    case 'mainnet':
      break
    case 'testnet':
      Config.GENESIS_EPOCHE = Config.GENESIS_EPOCHE_TESTNET
      Config.GENESIS_MESSAGE = Config.GENESIS_MESSAGE_TESTNET
      Config.INITIAL_ACCOUNT = Config.INITIAL_ACCOUNT_TESTNET
      Config.dbName = Config.dbName + '.' + Config.netType
      break
    case 'devnet':
    default:
      Config.GENESIS_EPOCHE = require('./util/Date.js').time2epoche({
        type: 'prevHour'
      }) // nextMin: 下一分钟（单机测试）， prevHour: 前一小时（多机测试），或 new Date('2018-07-03T10:15:00.000Z') // 为了方便开发，暂不使用固定的创世时间，而是生成当前时刻之后的第一个0秒，作为创世时间
      Config.GENESIS_MESSAGE = Config.GENESIS_MESSAGE_DEVNET
      Config.INITIAL_ACCOUNT = Config.INITIAL_ACCOUNT_DEVNET
      Config.dbName = Config.dbName + '.' + Config.netType
  }

  mylog.info('Configuration is ready.')
  return Config
}
async function masterInit(worker) {
  global.mylog = require('./util/Logger.js')
  global.wo = {}
  wo.Tool = new(require('./util/Egg.js'))()
  wo.Config = config()
  wo.Crypto = require('./util/Crypto.js')
  if (!wo.Crypto.isSecword(wo.Config.ownerSecword)) {
    mylog.error('Invalid secword! Please setup a secword in ConfigSecret.js')
    process.exit()
  }
  wo.Config.port = wo.Config.consPort;
  wo.Ling = require('./Ling/_Ling.js')
  mylog.info('Initializing Consensus......')
  wo.Block = require('./Module/Chain/Block.js')
  wo.Peer = await require('./Module/P2P/index.js')
  wo.Store = await require('./Module/util/Store.js')('redis') //  必须指定数据库,另外不能_init(),否则会覆盖子进程已经设定好的内容
  wo.EventBus = require('./Module/util/EventBus.js')(worker).mount(worker);
  wo.Consensus = await require('./Module/Consensus/' + wo.Config.consensus + '.js')
  wo.Consensus._init(worker);
}
async function workerInit() {
  global.mylog = require('./util/Logger.js')
  global.wo = {}
  wo.Tool = new(require('./util/Egg.js'))()
  wo.Config = config()
  wo.Crypto = require('./util/Crypto.js')
  if (!wo.Crypto.isSecword(wo.Config.ownerSecword)) {
    mylog.error('Invalid secword! Please setup a secword in ConfigSecret.js')
    process.exit()
  }
  mylog.info('Initializing database......')
  wo.Data = await require('./Data/' + wo.Config.dbType)._init(wo.Config.dbName);
  mylog.info('Loading classes and Creating tables......');
  wo.Ling = require('./Ling/_Ling.js');
  wo.Account = await require('./Module/Token/Account.js');
  wo.Action = await require('./Module/Action/Action.js')._init();
  wo.Tac = await require('./Module/Token/Tac.js')._init();
  wo.ActTransfer = require('./Module/Action/ActTransfer.js');
  wo.ActStorage = require('./Module/Action/ActStorage.js');
  wo.ActMultisig = require('./Module/Action/ActMultisig.js');
  wo.ActTac = require('./Module/Action/ActTac.js');
  wo.Bancor = require('./Module/Token/Bancor.js')._init();
  mylog.info('Initializing chain............');
  wo.Peer = await require('./Module/P2P/index.js');
  wo.Block = await require('./Module/Chain/Block.js')._init();
  wo.Store = await require('./Module/util/Store.js')('redis')._init();
  wo.EventBus = require('./Module/util/EventBus.js')(process);
  wo.Consensus = wo.EventBus;
  wo.Chain = await require('./Module/Chain/Chain.js')._init();
  return 0;
}
async function p2pInit(){
  global.mylog = require('./util/Logger.js')
  global.wo = {}
  wo.Tool = new(require('./util/Egg.js'))()
  wo.Config = config()
  wo.Config.port = wo.Config.consPort;
  wo.Crypto = require('./util/Crypto.js')
  if (!wo.Crypto.isSecword(wo.Config.ownerSecword)) {
    mylog.error('Invalid secword! Please setup a secword in ConfigSecret.js')
    process.exit()
  }
  wo.Ling = require('./Ling/_Ling.js');
  serverInit();
  wo.Peers = await require('./Module/P2P/Peers.js')._init();
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

  server.use(Morgan('development' === server.get('env') ? 'dev' : 'combined')) // , {stream:require('fs').createWriteStream(path.join(__dirname+'/Data.log', 'http.log'), {flags: 'a', defaultEncoding: 'utf8'})})) // format: combined, common, dev, short, tiny.  发现 defaultEncoding 并不起作用。
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
      option[key] = wo.Tool.json2obj(ask.query[key])
      mylog.info(key + " : " + option[key])
    }
    for (let key in ask.body) { // POST 方法传来的参数
      option[key] = wo.Tool.json2obj(ask.body[key])
    }
    /////////// authentication ///////////////////
    option._req = ask;
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
  if ('http' === wo.Config.protocol) { // 如果在本地localhost做开发，就启用 http。注意，从https网页，不能调用http的socket.io。Chrome/Firefox都报错：Mixed Content: The page at 'https://localhost/yuncai/' was loaded over HTTPS, but requested an insecure XMLHttpRequest endpoint 'http://localhost:6327/socket.io/?EIO=3&transport=polling&t=LoRcACR'. This request has been blocked; the content must be served over HTTPS.
    let webServer = require('http').createServer(server)
    webServer.listen(wo.Config.port, function (err) {
      mylog.info('Server listening on %s://%s:%d for %s environment', wo.Config.protocol, wo.Config.host, wo.Config.port, server.settings.env)
    });
    if(cluster.isWorker)
      wo.Socket = socket.listen(webServer);
  } else if ('https' === wo.Config.protocol) { // 启用 https。从 http或https 网页访问 https的ticnode/socket 都可以，socket.io 内容也是一致的。
    let webServer = require('https').createServer({
      key: fs.readFileSync(wo.Config.sslKey),
      cert: fs.readFileSync(wo.Config.sslCert) // , ca: [ fs.readFileSync(wo.Config.sslCA) ] // only for self-signed certificate: https://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener
    }, server);
    webServer.listen(wo.Config.port, function (err) {
      mylog.info('Server listening on %s://%s:%d for %s environment', wo.Config.protocol, wo.Config.host, wo.Config.port, server.settings.env)
    });
    if(cluster.isWorker)
      wo.Socket = socket.listen(webServer);
  } else if ('httpall' === wo.Config.protocol) { // 同时启用 http 和 https
    let portHttp = wo.Config.port ? wo.Config.port : 80 // 如果port参数已设置，使用它；否则默认为80
    let httpServer = require('http').createServer(server)
    httpServer.listen(portHttp, function (err) {
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
    if(cluster.isWorker)
      wo.Socket = socket.listen(webServer);
  }
  wo.Socket.sockets.on('connection',(socket)=>{
    // 处理操作
    mylog.info('new client connected');
  });
}

(async function Start() {
  if (cluster.isMaster) {
    var worker = cluster.fork();
    var p2pWorker = cluster.fork();
    cluster.once('message', async (worker, message) => {
      if (message.code==200) {
          mylog.warn(`[Master] 主程序初始化完毕，启动共识模块......`);
          await masterInit(worker);
          return 0;
      }
    });
    cluster.on('exit', function (worker, code, signal) {
      mylog.error('worker ' + worker.process.pid + ' died, Restarting');
      var worker = cluster.fork();
      cluster.once('message', async (worker, message) => {
        if (message.code==200) {
            mylog.warn(`[Master] 主程序初始化完毕，启动共识模块......`);
            await masterInit(worker);
            serverInit();
            return 0;
        }
      });
    });
  }
  else if(cluster.worker.id === 1) {
    /**BlockChain以及RPC服务进程 */
    await workerInit();
    process.send({
      code: 200
    });
    serverInit();
  }
  else{
    mylog.info(`${cluster.worker.id}号p2p进程启动`)
    await p2pInit();
  }
})()