'use strict'
const redis = require('ioredis');

class redisStore extends redis{
    constructor(option){
        super(option);
        this.dbType = 'redis';
    }
    async setKey(key, value){
        return await this.set(key,JSON.stringify(value))
    }
    async getKey(key){
        return JSON.parse(await this.get(key))
    }    
}

function Store(dbType,option){
    switch(dbType){
        case 'redis':
            return new redisStore(option);
    }
}
module.exports = Store