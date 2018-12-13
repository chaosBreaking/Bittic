/*
var colors = require('colors') // require后，字符串被添加了一系列方法： str.white, str.inverse, ...
// colors.styles: bold,italic,underline,inverse,yellow,cyan,white,magenta,green,red,grey,blue,rainbow,zebra,random
// 自定义的 themes：
colors.setTheme({
  logprompt: 'inverse',
  logok:'green',
  logerror: 'red',
  logwarn: 'magenta',
  logtitle: 'cyan'
})
*/

var bunyan = require('bunyan')
var PrettyStream = require('bunyan-pretty-colors')
 
var prettyStdOut = new PrettyStream()
prettyStdOut.pipe(process.stdout)

var logger = bunyan.createLogger({
  name: "log", 
  src: false,
  streams: [
    {
      level: 'info',
      stream: prettyStdOut
    },
    {
      level: 'info',
      type: 'rotating-file',
      path: './deployer/deployer.log',
      period: '1d',   // daily rotation
      count: 30       // keep 30 days
    }
  ]
})

module.exports=logger // trace, debug, info, warn, error, fatal