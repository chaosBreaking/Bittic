'use strict'
const event = require('events')
module.exports = class Proxy extends event {
  constructor () {
    super()
    wo.EventBus.on('Peer', (event, data) => {
      mylog.info('proxy收到!!!!!!!!!!')
      this.emit(event, data)
    })
  }
  async emitPeers (event, data) {
    return await wo.EventBus.call('Peer', '', 'emitPeers', [event, data])
  }
  async broadcast (data) {
    return await wo.EventBus.call('Peer', '', 'broadcast', data)
  }
  async call (route, param) {
    return await wo.EventBus.call('Peer', '', 'call', [route, param])
  }
}
