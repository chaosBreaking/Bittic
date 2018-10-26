'use strict'
const redis = require('ioredis');

class redisStore extends redis{
    constructor(option){
        super(option);
        this.dbType = 'redis';
    }
    async setKey(key, value){
      try {
        return await this.set(key,JSON.stringify(value))
      } catch (error) {
        return false
      }
    }
    async getKey(key){
      try {
        return JSON.parse(await this.get(key))
      } catch (error) {
        return false
      }
    }
    async delKey(key){
      try {
        return await this.del(key)
      } catch (error) {
        return false
      }
    }    
}

function Store(dbType,option){
    switch(dbType){
        case 'redis':
            return new redisStore(option);
    }
}
module.exports = Store