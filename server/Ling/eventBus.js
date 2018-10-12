'use strict'

const workerPool = [];

function EventBus(obj) {
  if (!new.target)
    return new EventBus(obj);
  this.obj = obj;
  this.api = api;
}

EventBus.prototype.mount = function (worker) {
  workerPool.push(worker);
  return this;
}
EventBus.prototype.link = function (worker) {
  this.obj = worker;
  return this;
}
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
EventBus.prototype.emit = async function (code, data) {
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
EventBus.prototype.get = async function (who, api, act, param) {
  let id = String(Math.random()).slice(2, 18);
  if (this.obj && this.obj.send) {
    this.obj.send({
      code : 'get', 
      data : {
        who, api, act, id, param
      }
    });
    return await wo.Store.storeAPI.getKey(id);
  }
}
EventBus.prototype.call = function (who, api, act, param) {
  if (this.obj && this.obj.send) {
    this.obj.send({
      code: 'call', data: {
        who, api, act, param
      }
    });
  }
  return 1;
}

const api = {}

api.remoteCall = function(option){
  if(option && option.data){
    mylog.info('remotecall');
    return wo.EventBus.call(option.data.who, option.data.api, option.data.act ,option.data.param);
  }
  return null
}


  module.exports = EventBus