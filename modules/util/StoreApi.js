'use strict'
const redis = require('ioredis')
const exec = require('child_process').exec
const execAsync = function (command) {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) reject(err)
      else resolve('ok')
    })
  })
}
async function PingRedis (newRedis) {
  let mission = new Promise((resolve, reject) => {
    newRedis.ping().then((res) => {
      res === 'PONG' ? resolve(true) : resolve(false)
    })
  })
  let delayMission = new Promise((resolve, reject) => setTimeout(() => {
    resolve(false)
  }, 600))
  return await Promise.race([mission, delayMission])
}

class RedisStore extends redis {
  constructor (option) {
    super(option)
    this.dbType = 'redis'
  }
  async setKey (key, value) {
    try {
      return await this.set(key, JSON.stringify(value))
    } catch (error) {
      return false
    }
  }
  async getKey (key) {
    try {
      return JSON.parse(await this.get(key))
    } catch (error) {
      return false
    }
  }
  async delKey (key) {
    try {
      return await this.del(key)
    } catch (error) {
      return false
    }
  }
}

module.exports = function (dbType, option) {
  switch (dbType) {
    case 'redis':
      let newRedis = new RedisStore(option)
      PingRedis(newRedis).then((res) => {
        if (!res) execAsync('redis-server').catch(() => { mylog.error('无法连接到redis...') })
      })
      return newRedis
  }
}
