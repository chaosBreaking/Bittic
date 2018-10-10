'use strict'

const workerPool = [];

function eventBus(obj) {
  if (!new.target)
    return new eventBus(obj);
  this.obj = obj;
}
eventBus.prototype.mount = function (worker) {
  workerPool.push(worker);
}
eventBus.prototype.send = function (code, data = '') {
  if (this.obj && this.obj.send)
    this.obj.send({ code, data });
}
eventBus.prototype.get = async function (who, api, act, param) {
  let id = String(Math.random()).slice(2, 18);
  if (this.obj && this.obj.send) {
    this.obj.send({
      code : 'get', 
      data : {
        who, api, act, id, param
      }
    });
    return await setImmediate(await wo.Store.storeAPI.getKey(id));
  }
}
eventBus.prototype.call = function (who, api, act, param) {
  if (this.obj && this.obj.send) {
    this.obj.send({
      code: 'call', data: {
        who, api, act, param
      }
    });
  }
  return 1;
}
/**
 * 
 * 子进程的信号处理代码
 * @param {*} message 
 */
eventBus.prototype.workerHandler = async function (message) {
  if (message && message.code) {
    switch (message.code) {
      //子进程处理Master触发的事件
      case 100:
        mylog.warn('[Worker] 100 -- 主进程启动共识');
        return 0;
      case 110:
        return 0;
      case 120:
        return 0;
      case 130:
        mylog.info('[Worker]: 收到出块阶段预告......')
        return 0;
      case 'get':
        let res = message.data.api ? wo[message.data.who]['api'][message.data.act](message.data.param)
          : wo[message.data.who][message.data.act](message.data.param)
        return wo.Store.storeAPI.setKey(message.data.id, res);
      case 'call':
        message.data.api ? wo[message.data.who]['api'][message.data.act](message.data.param)
          : wo[message.data.who][message.data.act](message.data.param)
        return 0;
    }
  }
  return 0
}

//主进程的信号处理代码因为启动顺序制约只能写在init.js里

eventBus.prototype.emit = async function (code, data) {
  for (let worker of workerPool) {
    worker.send({ code, data });
  }
  return 0
}

module.exports = eventBus