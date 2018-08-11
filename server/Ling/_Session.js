/**
 * 用于后台记录前端发来的http请求及其相关信息。
 */

var Ling = require('./_Ling')

function Session(prop){ 
  this._class=this.constructor.name
  this.setProp(prop)
}
const DAD=module.exports=Session
DAD.__proto__=Ling
DAD._table=DAD.name
const MOM=DAD.prototype={ // 原型对象
  constructor:DAD,
  __proto__:Ling.prototype
}

MOM._tablekey='rowid'
MOM._model={
  uid: { default:undefined, js:null, sqlite:'INTEGER',  mysql:'BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY' },
  whenStart: { default:null, js:null, sqlite:'INTEGER',  mysql:'datetime DEFAULT NULL' },
  whenEnd: { default:null, js:null, sqlite:'INTEGER',  mysql:'datetime DEFAULT NULL' },
  client: { default:null, js:null, sqlite:'TEXT',  mysql:'json DEFAULT NULL', info:'request' }, // 客户端(browser, phone, ...)
  request: { default:null, js:null, sqlite:'TEXT',  mysql:'json DEFAULT NULL', info:'option' },
  data: { default:null, js:null, sqlite:'TEXT',  mysql:'json default NULL', info:'response' },
  star: { default:null, js:null, sqlite:'TEXT',  mysql:'json DEFAULT NULL' },
  webInfo: { default:null, js:null, sqlite:'TEXT',  mysql:'json DEFAULT NULL', info:'必有的web information' },
  appInfo: { default:null, js:null, sqlite:'TEXT',  mysql:'json DEFAULT NULL', info:'可有的app information' },
  whenInserted: { default:undefined, js:null, sqlite:'INTEGER',  mysql:'timestamp NULL DEFAULT CURRENT_TIMESTAMP' },
  whenUpdated: { default:undefined, js:null, sqlite:'INTEGER',  mysql:'timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
  location: { default:null, js:null, sqlite:'TEXT',  mysql:'JSON DEFAULT NULL', info:'包含地理位置（经纬度，海拔，方向，等等）和社会地址{country:{},province:{},city:{},......}。' }
}

// 定义类的公开数据和方法（不能从对象里使用）。作为面向前端的api。
DAD.logRequest=function (ask, option, result){
  delete option._req; // req 不能被 JSON.stringify，因为 TypeError: Converting circular structure to JSON
  wo.Session.addOne({Session:{ // 不需要await
    whenStart:option._whenStart,
    whenEnd:new Date(),
//      sessid:ask.session.id,
    data:option, // ask.session,
    client:{
      ip: ask.ip || ask.headers['x-forwarded-for'] || ask.connection.remoteAddress,  // io.sockets.on 'connection', (socket) -> ip = socket.handshake.address.address 
      protocol:ask.protocol,
//        hostname:ask.hostname,
      host:ask.headers.host, // === ask.get('host')
//        url:ask.url,
      originalUrl:ask.originalUrl
    },
    result:result
  }});
//    mylog.info('》》'+JSON.stringify(result));
}


// 记录手机用户的移动事件
DAD.logMoveEvent=function(option){
  if (option.Session.location) {
    move=new Event({model:'PERSON',action:'MOVE', info:option.Session.location, starId:option.starId});
    move.addMe();
  }
}
