'use strict'
const event = require('events')
module.exports = class Proxy extends event{
  constructor() {
    super()
    wo.EventBus.on('Peer', (event, data) => {
      mylog.info('proxyshoudao!!!!!!!!!!')
      this.emit(event, data)
    })
  }
  broadcast() {

  }
  randomcast() {

  }
}