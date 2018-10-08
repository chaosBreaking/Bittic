'use strict'

const workerPool = [];

function eventBus(obj){
    if(!new.target)
        return new eventBus(obj);
    this.obj = obj;

}
eventBus.mount = function(worker){
    workerPool.push(worker);
}
eventBus.prototype.send = function(code, data = ''){
    if(this.obj && this.obj.send)
        this.obj.send({code, data});
}
eventBus.prototype.get = async function(who, api, act, param){
    let id = String(Math.random()).slice(2,18);
    if(this.obj && this.obj.send){
        this.obj.send({code : 'get', data : {
            who, api, act, id, param
        }});
        return await wo.Store.storeAPI.getKey(id);
    }
}
eventBus.prototype.call = async function(who, api, act, param){
    let id = String(Math.random()).slice(2,18);
    if(this.obj && this.obj.send){
        this.obj.send({code : 'call', data : {
            who, api, act, param
        }});
        return await wo.Store.storeAPI.getKey(id);
    }
}
eventBus.prototype.handler = async function(message){
    if(message && message.code){
        switch(message.code){
            //子进程处理Master触发的事件
            case 100:
                mylog('[Worker] 主进程启动共识');
                return 0;
            case 110:
                return 0;
            case 120:
                return 0;
            case 130:
                return 0;
            case 'get':
                return 0;
            case 'call':
                message.data.api?wo[message.data.who]['api'][message.data.act](message.data.param)
                :wo[message.data.who][message.data.act](message.data.param)
        }
    }
    return 0
}
eventBus.prototype.emit = async function(code, data){
    for(let worker of workerPool){
        worker.send({code, data});
    }
    return 0
}

module.exports = eventBus