'use strict'

const workerPool = [];

function eventBus(obj) {
  if (!new.target)
    return new eventBus(obj);
  this.obj = obj;
}

eventBus.prototype.mount = function (worker) {
  workerPool.push(worker);
  return this;
}
eventBus.prototype.link = function (worker) {
  this.obj = worker;
  return this;
}
eventBus.prototype.send = function (code, data = '') {
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
eventBus.prototype.emit = async function (code, data) {
  for (let worker of workerPool) {
    try {
      worker.send({ code, data })
    } catch (error) {
      workerPool.splice(workerPool.indexOf(worker),1);    
      mylog.warn('deleted dead worker')
    }
  }
  return 0;
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

module.exports = eventBus