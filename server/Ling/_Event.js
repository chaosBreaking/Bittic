/**
 * 用于记录后台运行中发生的事件，例如登录失败等等。
 */

var Ling = require('./_Ling.js')

function Event(prop){
  this._class=this.constructor.name
  this.setProp(prop)
}
const CLASS=module.exports=Event
CLASS.__proto__=Ling
CLASS._table=CLASS.name
const PROTO=CLASS.prototype={ // 原型对象
  constructor:CLASS,
  __proto__:Ling.prototype
}

PROTO._model={
  aiid: { default:undefined, js:null, sqlite:'INTEGER PRIMARY KEY', mysql:"BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY" },
  starId: { default:null, js:null, sqlite:'TEXT', mysql:"VARCHAR(255) DEFAULT NULL" },
  tag: { default:null, js:null, sqlite:'TEXT', mysql:"VARCHAR(255) DEFAULT NULL" },
  mark: { default:null, js:null, sqlite:'TEXT', mysql:"VARCHAR(50) DEFAULT NULL" },
  model: { default:null, js:null, sqlite:'TEXT', mysql:"VARCHAR(50) DEFAULT NULL" },
  action: { default:null, js:null, sqlite:'TEXT', mysql:"VARCHAR(50) DEFAULT NULL" },
  result: { default:null, js:null, sqlite:'TEXT', mysql:"VARCHAR(255) DEFAULT NULL" },
  sessionKey: { default:null, js:null, sqlite:'INTEGER', mysql:"BIGINT(20) UNSIGNED DEFAULT NULL" },
  onSid: { default:null, js:null, sqlite:'INTEGER', mysql:"BIGINT(20) UNSIGNED DEFAULT NULL" },
  onCid: { default:null, js:null, sqlite:'INTEGER', mysql:"BIGINT(20) UNSIGNED DEFAULT NULL" },
  onWid: { default:null, js:null, sqlite:'INTEGER', mysql:"BIGINT(20) UNSIGNED DEFAULT NULL" },
  onMid: { default:null, js:null, sqlite:'INTEGER', mysql:"BIGINT(20) UNSIGNED DEFAULT NULL" },
  whenInserted: { default:undefined, js:null, sqlite:'TEXT', mysql:"timestamp NULL DEFAULT CURRENT_TIMESTAMP" },
  whenUpdated: { default:undefined, js:null, sqlite:'TEXT', mysql:"timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" },
  info: { default:{}, js:null, sqlite:'TEXT', mysql:"JSON DEFAULT NULL" },
}