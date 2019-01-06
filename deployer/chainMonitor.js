'use strict'
const Monitor = {}
const socket = require('socket.io-client')('http://localhost:6822')
socket.on('broadcast', (msg, socket) => {

})
Monitor.socket = socket
Monitor.hasChain = () => Monitor.socket.connected
module.exports = Monitor
