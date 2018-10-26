'use strict'
const EventEmitter = require('events');
const util = require('util');
const workerPool = [];

function EventBus(obj) {
  if (!new.target)
    return new EventBus(obj);
  this.obj = obj;
  this.obj.on('message', async (message) => {
    if(message && message.code && message.code !== 'call'){
      this.emit(message.code, message);
    }
    else{
      var callres = message.data.api ? await wo[message.data.who]['api'][message.data.act](message.data.param)
      :await wo[message.data.who][message.data.act](message.data.param)
      wo.EventBus.send(message.data.id, callres);
      return 0;
    }
  });
}
util.inherits(EventBus, EventEmitter);
/**
 * 在进程内挂载进程至通信对象池
 */
EventBus.prototype.mount = function (worker) {
  workerPool.push(worker);
  return this;
}
/**
 * 在进程内关联通信目标进程
 */
EventBus.prototype.link = function (worker) {
  this.obj = worker;
  return this;
}
/**
 * 进程间消息传递
 */
EventBus.prototype.send = function (code, data = '') {
  if (this.obj && this.obj.send){
    try {
      this.obj.send({ code, data });
      return 1;
    } catch (error) {
      mylog.error('[EventBus] Dead Worker');
      return 0;
    }
  }
}
/**
 * 跨进程函数调用
 */
EventBus.prototype.call = function (who, api, act, param) {
  if (this.obj && this.obj.send) {
    let id = Math.random().toString().slice(2,10);
    let res = new Promise((resolve,reject) => {
      this.once(id, (msg)=>{
        resolve(msg.data);
      });
    });
    this.obj.send({
      code: 'call', data: {
        who, api, act, param, id
      }
    });
    return res;
  }
  throw new Error("Can't find Call Object")
}

module.exports = EventBus