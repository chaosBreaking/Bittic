'use strict'
const storeAPI = require('../Base/Store.js');


function Store(dbType,option){
    if(!new.target)
        return new Store(dbType,option)
    Object.defineProperties(this,{ 
        'dbType':{
            value:dbType,
            writable:false,
            enumerable:true
        },
        'storeAPI':{
            value : storeAPI(dbType, option),
            writable:false,
            enumerable:false
        }
    });
}
Store.prototype._init = async function(){
    await this.storeAPI.flushdb();
    await Promise.all([
        this.storeAPI.setKey('recBlockStack',[]),
        this.storeAPI.setKey('topBlock',''),
    ]);
    return this
}

Store.prototype.getBalance = async function(address){
    return JSON.parse(await this.storeAPI.getKey(address));
}

Store.prototype.increase = async function(address, amount){
    return JSON.parse(await this.storeAPI.incrbyfloat(address, amount));
}
Store.prototype.decrease = async function(address, amount){
    return JSON.parse(await this.storeAPI.incrbyfloat(address, 0 - amount));
}
Store.prototype.pushInRBS = async function(block){
    let stack = await this.storeAPI.getKey('recBlockStack');
    stack.push(block);
    stack.length > wo.Config.MaxRBS ? stack.shift():null;
    await this.storeAPI.setKey('recBlockStack', stack);
}
Store.prototype.pushTopBlock = async function(block){
    //getTopBlock 作用是 取高度，取hash 取整个块向外广播
    await this.storeAPI.setKey('topBlock', JSON.stringify({
        height : block.height,
        hash : block.hash
    }));
}
Store.prototype.getTopBlock = async function(){
    return JSON.parse(await this.storeAPI.getKey('topBlock'));
}

module.exports = Store


/**

        block
            totalFeeForNewBlock,
            totalAmountForNewBlock,

        action
            DAD.actionPool = {} // 随时不断接收新的交易请求
            DAD.currentActionPool = {} // 仅包含0~40秒的交易,40~59秒的交易将被堆积到actionPool。    

        chain
            genesis:{}
            ,
            topBlock:null // 当前已出的最高块
            ,
            lastBlock:null // 当前已出的次高块
            ,
            addingLock:false
            ,

 */
