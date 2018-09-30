const Redis = require('ioredis')
module.exports = class Store extends Redis {
    constructor(port, host,config){
        if(global._RedisStore)
            return wo.Store
        global._RedisStore = 'Ready'
        super(port, host,config)
        return this
    }
    static async _init(port = 6379, host = '127.0.0.1', config = {}) {
        if(global._RedisStore) return 0
        let redis = new Store(port,host,config)
        await redis.setKey('actionPool',{})
        await redis.setKey('currentActionPool',{})
        await redis.setKey('totalAmountForNewBlock',0)
        await redis.setKey('totalFeeForNewBlock',0)
        return redis
    }
    async setKey(key, value){
        return await this.set(key,JSON.stringify(value))
    }
    async getKey(key){
        return JSON.parse(await this.get(key))
    }
}


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
