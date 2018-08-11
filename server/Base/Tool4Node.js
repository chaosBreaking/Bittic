require('./Date.js')

module.exports=new (require('./Egg.js'))()
.extendMe(require('./Messenger.js'))
.extendMe(require('./Webtoken.js'))
.extendMe(require('./Network.js'))
