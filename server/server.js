'use strict'

const fs = require('fs')
const path = require('path')

// 配置参数（按优先级从低到高）：
// ConfigSys: 系统常量（全大写） 以及 默认参数（小写开头驼峰式）
// ConfigUser: 用户或应用自定义参数。本文件不应纳入版本管理。
// ConfigSecret: 机密参数，例如哈希盐，webtoken密钥，等等。本文件绝对不能纳入版本管理。
// 命令行参数
function config(){
  const commander = require('commander')
  const deepmerge = require('deepmerge')

  var Config={}

  // 读取配置文件
try {
  if (fs.existsSync('./ConfigSys.js')) {
    Config=require('./ConfigSys.js')
    mylog.info('ConfigSys loaded')
  }
  if (fs.existsSync('./ConfigUser.js')) { // 如果存在，覆盖掉 ConfigSys 里的默认参数
    Config=deepmerge(Config, require('./ConfigUser.js')) // 注意，objectMerge后，产生了一个新的对象，而不是在原来的Config里添加
    mylog.info('ConfigUser loaded')
  }
  if (fs.existsSync('./ConfigSecret.js')) { // 如果存在，覆盖掉 ConfigSys 和 ConfigUser 里的参数
    Config=deepmerge(Config, require('./ConfigSecret.js'))
    mylog.info('ConfigSecret loaded')
  }
}catch(err){
  mylog.error('Loading config files failed: '+err.message)
}

// 载入命令行参数
  commander
  .version(Config.VERSION, '-v, --version') // 默认是 -V。如果要 -v，就要加 '-v --version'
  .option('-c, --consensus <type>', 'Consensus type: Pot (default), Pow, Alone, etc.')
  .option('--dbType <type>', 'Database type mysql|sqlite')
  .option('--dbName <name>', 'Database name')
  .option('-h, --host <host>', 'host ip or domain name')
  .option('-n, --netType <net>', 'devnet/testnet/mainnet')
  .option('-o, --ownerSecword <secword>', 'Node owner\'s secword')
  .option('-P, --protocol <protocol>', 'Web server protocol http|https|httpall')
  .option('-p, --port <port>', 'Server port')
  .option('--p2p <p2p>', 'P2P protocol: http|udp')
  .option('-s, --seedSet <seedSet>', 'Peers array in JSON, such as \'["http://ip_or_dn:port"]\'')
  .option('--sslCert <cert>', 'SSL cert file')
  .option('--sslKey <key>', 'SSL privkey file')
  .option('--sslCA <ca>', 'SSL ca bundle file')
  .parse(process.argv)

  // 把命令行参数 合并入配置。
  Config.consensus='Cons'+(commander.consensus||Config.consensus||'Pot')
  mylog.info('Consensus used: ', Config.consensus)
//  if (typeof(Config.consensus)==='string' && ['ConsPot','ConsPotHard'].indexOf(Config.consensus)<0) {
//    mylog.info('共识模式无法识别，目前仅支持 ConsPot, ConsPotHard。转为默认的单机出块模式。')
//    Config.consensus=null
//  }
  Config.dbType = commander.dbType || Config.dbType
  Config.dbName = commander.dbName || Config.dbName
  Config.host=commander.host || Config.host
  Config.netType = commander.netType || Config.netType
  Config.ownerSecword = commander.ownerSecword || Config.ownerSecword
  Config.protocol=commander.protocol || Config.protocol
  Config.port=parseInt(commander.port) || parseInt(Config.port) || (Config.protocol==='http'?6842:Config.protocol==='https'?6842:undefined) // 端口默认为6842(http,https), 或80|443(httpall)
  Config.p2p=commander.p2p || Config.p2p
  Config.seedSet= commander.seedSet ? JSON.parse(commander.seedSet) : Config.seedSet
  Config.sslCert=commander.sslCert || Config.sslCert
  Config.sslKey=commander.sslKey || Config.sslKey
  Config.sslCA=commander.sslCA || Config.sslCA

  mylog.info('Configuration is ready.')

  return Config
}

async function init(){  /*** 设置全局对象，启动时光链 ***/

  global.mylog=require('./Base/Logger.js') // 简写 console.log，为了少敲几个字母

  global.wo={} // wo 代表 world或‘我’，是当前的命名空间，把各种类都放在这里，防止和其他库的冲突。
  wo.Tool=new (require('./Base/Egg.js'))().extendMe(require('./Base/Webtoken.js'))
  wo.Config=config() // 依次载入系统默认配置、用户配置文件、命令行参数
  wo.Crypto=require('./Base/Crypto.js')
  if (!wo.Crypto.isSecword(wo.Config.ownerSecword)){
    mylog.error('Invalid secword! Please setup a secword in ConfigSecret.js')
    process.exit()
  }

  mylog.info('Initializing database......')
  wo.Data=await require('./Data/'+wo.Config.dbType)._init(wo.Config.dbName)

  mylog.info('Loading classes and Creating tables......')
  // wo.Session=await require('./Ling/_Session.js')._init() // 目前不使用。
  wo.Ling=require('./Ling/_Ling.js')
  wo.Account=await require('./Ling/Account.js')._init()
  wo.Action=await require('./Ling/Action.js')._init()
  wo.Token = await require('./Ling/Token.js')._init()
  wo.TokenAccount = await require('./Ling/TokenAccount.js')._init()
  wo.ActTransfer=require('./Ling/ActTransfer.js')
  wo.ActStorage = require('./Ling/ActStorage.js')
  wo.ActToken = require('./Ling/ActToken.js')
  wo.ActMultisig = require('./Ling/ActMultisig.js')
  wo.Bancor = require('./Ling/Bancor.js')._init()

  mylog.info('Initializing chain............')
  wo.Peer=await require('./Ling/Peer.js')._init()
  // if (wo.Config.consensus==='ConsPow') {
  //   wo.Block=await require('./Ling/Blockpow.js')._init()  
  //   wo.Consensus=require('./Ling/ConsPow.js')
  //   wo.Chain=await require('./Ling/ChainPow.js')._init()
  //   wo.NetUDP = require('./Base/NetUDP.js')._init()
  // }
  // else {
  wo.Block=await require('./Ling/Block.js')._init()
  wo.Consensus=require('./Ling/'+wo.Config.consensus+'.js') // todo: 目前的 wo.Chain 对 wo.Consensus 有依赖，只能把 wo.Consensus 放在前面
  wo.Chain=await require('./Ling/Chain.js')._init() // 用await，完成同步后，并且在赋值wo.Chain后才开始 web服务
  // }
}

(async function start(){ // 配置并启动 Web 服务

  await init()

  mylog.info("★★★★★★★★ Starting Server......")

  const Express = require('express')
  //const Cors = require('cors')
  const Morgan=require('morgan')
  const MethodOverride=require('method-override')
  //const Session = require('express-session') // https://github.com/expressjs/session // 不再使用 session 来管理在线用户，而是用 webtoken 了。
  //const Redis = require('connect-redis')(Session)
  const CookieParser=require('cookie-parser')
  const BodyParser=require('body-parser')
  const Favicon = require('serve-favicon')
  const ErrorHandler=require('errorhandler')

  const server = Express()

  /*** 通用中间件 ***/

  server.use(Morgan('development'===server.get('env')?'dev':'combined')) // , {stream:require('fs').createWriteStream(path.join(__dirname+'/Data.log', 'http.log'), {flags: 'a', defaultEncoding: 'utf8'})})) // format: combined, common, dev, short, tiny.  发现 defaultEncoding 并不起作用。
  server.use(MethodOverride())
  //server.use(Session({store: new Redis({host: "127.0.0.1", port: 6379}), resave:false, saveUninitialized:false, name: 'server.sid', secret: wo.Config.tokenKey, cookie: {  maxAge: wo.Config.SESSION_LIFETIME*1000 }})) // name: 'connect.sid'
  server.use(CookieParser())
  server.use(BodyParser.json({limit: '50mb'})) // 用于过滤 POST 参数
  server.use(BodyParser.urlencoded({ limit: '50mb', extended: true }))
  //server.use(Cors())
  server.use(Express.static(__dirname+'/Web')) // 可以指定到 node应用之外的目录上。windows里要把 \ 换成 /。
  //server.use(Favicon(__dirname + '/www/favicon.ico'))
  //server.use('webpath', Express.static('filepath'))

  /*** 路由中间件 ***/

  server.all('/:_api/:_who/:_act', async function(ask, reply){ // http://address/api/Block/getBlockList

    /* 把前端传来的json参数，重新解码成对象 */
    var option={}
    for (let key in ask.query){ // GET 方法传来的参数
      option[key]=wo.Tool.json2obj(ask.query[key])
      mylog.info(key+" : "+option[key])
    }
    for (let key in ask.body){ // POST 方法传来的参数
      option[key]=wo.Tool.json2obj(ask.body[key])
    }
    /////////// authentication ///////////////////
    option._token=wo.Tool.verifyToken(option._token)||{} // aiid, pwdClient, whenTokenCreated
    option._token.isOnline=function(){
      return this.onlineUser?true:false // =0或null时，代表没有登录，是匿名用户。
    }
    option._whenStart=new Date()
    option._req=ask // File_upload, Provice_verifyPay 需要 _req

    async function normalize(result){ // 有的实例的normalize 需要当前用户信息，比如 Message 要根据当前用户判断 vote 。所以这个函数定义在这里，把含有当前用户信息的option给它
      if (result && result instanceof wo.Ling){ // 是 Ling 元素。注意，字符串也有 normalize 方法，在WSL16+node9.4里会报错“RangeError: The normalization form should be one of NFC, NFD, NFKC, NFKD.”，所以必须判断是Ling，而不能只判断具有normalize方法。
        await result.normalize(option) // 有的 normalize 需要 option，例如检查当前用户是否投票了某消息
        // 不进入下一层去递归normalize了。
      }else if (result && typeof result==='object'){ // 是其他对象或数组
        for (var i in result){
          await normalize(result[i])
        }
      }else if (typeof result==='undefined'){ // reply.json(undefined 或 nothing) 会导致什么都不输出给前端，可能导致前端默默出错。因此这时返回null。
        result=null
      }
      return result
    }

    reply.setHeader('charset','utf-8')
    reply.setHeader('Access-Control-Allow-Origin','*')
    reply.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE')
    reply.setHeader('Access-Control-Allow-Headers','X-Requested-With,Content-Type')
  //  reply.setHeader("Content-Type",'json')  // 这一句用于 express 3。在 express 4里，已经 BodyParser.json()了，再加这句导致 TypeError: invalid media type。

    let _who=ask.params._who
    let _act=ask.params._act
    let _api=ask.params._api

    try{ // 把所有可能的exception都捕获起来，防止node死掉。
      if (wo[_who] && wo[_who][_api] && wo[_who][_api].hasOwnProperty(_act) && typeof wo[_who][_api][_act]==='function'){
        var result=await wo[_who][_api][_act](option)
//        wo.Session.logRequest(ask, option, result)
        reply.json(await normalize(result))  // 似乎 json(...) 相当于 send(JSON.stringify(...))。如果json(undefined或nothing)会什么也不输出给前端，可能导致前端默默出错；json(null/NaN/Infinity)会输出null给前端（因为JSON.stringify(NaN/Infinity)返回"null"）。
//        reply.send(JSON.stringify(result)) // 注意，如果用 send，null/undefined 会什么也不输出给前端。数字会被解释成http状态码。NaN/Infinity会导致出错。所以，send(JSON.stringify(result))
      }else{
//        wo.Session.logRequest(ask, option, {badapi:_who+'/'+_act})
        reply.json(null)
      }
    }catch(exception){
//      wo.Session.logRequest(ask, option, {exception:exception})
      mylog.info(exception)
      reply.json(null)
    }

  })

  server.all('*', function(ask, reply){    /* 错误的API调用进入这里。*/
    // 把前端传来的数据参数，重新解码成对象，以便存入日志。因为区块链现在不存储用户请求日志，所以全部注释掉。
    // var option={}
    // for (let key in ask.query){ // GET 方法传来的参数
    //   option[key]=wo.Tool.json2obj(ask.query[key])
    // }
    // for (let key in ask.body){ // POST 方法传来的参数
    //   option[key]=wo.Tool.json2obj(ask.body[key])
    // }
    // /////////// authentication ///////////////////
    // option._token=wo.Tool.verifyToken(option._token)||{} // aiid, pwdClient, whenTokenCreated
    // option._whenStart=new Date()
    // option._req=ask // File_upload, Provice_verifyPay 需要 _req
    // wo.Session.logRequest(ask, option, {badroute:ask.originalUrl})

    reply.json(null) // todo: null
  })

  // 错误处理中间件应当在路由加载之后才能加载
  if ('development'===server.get('env')) {
    server.use(ErrorHandler({
      dumpExceptions: true,
      showStack: true
    }))
  }

  /*** 启动 Web 服务 ***/
  // 同时或选择启用 http 和 https。如果同时启用，前端根据用户发起的http/https来各自连接，但这样子，两个socket.io之间不通，从https和http来访的用户之间，不能实时聊天。
  if ('http'===wo.Config.protocol) { // 如果在本地localhost做开发，就启用 http。注意，从https网页，不能调用http的socket.io。Chrome/Firefox都报错：Mixed Content: The page at 'https://localhost/yuncai/' was loaded over HTTPS, but requested an insecure XMLHttpRequest endpoint 'http://localhost:6327/socket.io/?EIO=3&transport=polling&t=LoRcACR'. This request has been blocked; the content must be served over HTTPS.
    let webServer=require('http').createServer(server)
    // wo.Chat.init(webServer)
    webServer.listen(wo.Config.port, function(err) {
      mylog.info('Server listening on %s://%s:%d for %s environment', wo.Config.protocol, wo.Config.host, wo.Config.port, server.settings.env)
    })
  }else if ('https'===wo.Config.protocol) { // 启用 https。从 http或https 网页访问 https的ticnode/socket 都可以，socket.io 内容也是一致的。
    let webServer = require('https').createServer({
      key: fs.readFileSync(wo.Config.sslKey), cert: fs.readFileSync(wo.Config.sslCert) // , ca: [ fs.readFileSync(wo.Config.sslCA) ] // only for self-signed certificate: https://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener
    }, server)
    // wo.Chat.init(webServer)
    webServer.listen(wo.Config.port, function(err) {
      mylog.info('Server listening on %s://%s:%d for %s environment', wo.Config.protocol, wo.Config.host, wo.Config.port, server.settings.env)
    })
  }else if ('httpall'===wo.Config.protocol) { // 同时启用 http 和 https
    let portHttp=parseInt(wo.Config.port)?parseInt(wo.Config.port):80 // 如果port参数已设置，使用它；否则默认为80
    let httpServer=require('http').createServer(server)
    // wo.Chat.init(httpServer)
    httpServer.listen(portHttp, function(err) {
      mylog.info('Server listening on %s://%s:%d for %s environment', wo.Config.protocol, wo.Config.host, portHttp, server.settings.env)
    })

    let portHttps=(wo.Config.port && wo.Config.port!==80)?wo.Config.port+443:443 // 如果port参数已设置，使用它+443；否则默认为443
    let httpsServer = require('https').createServer({
      key: fs.readFileSync(wo.Config.sslKey), cert: fs.readFileSync(wo.Config.sslCert) // , ca: [ fs.readFileSync(wo.Config.sslCA) ] // only for self-signed certificate: https://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener
    }, server)
    // wo.Chat.init(httpsServer)
    httpsServer.listen(portHttps, function(err) {
      mylog.info('Server listening on %s://%s:%d for %s environment', wo.Config.protocol, wo.Config.host, portHttps, server.settings.env)
    })
  }

})()
