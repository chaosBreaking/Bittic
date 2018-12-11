const pow = require('./pow.js')
const potSimple = require('./pot.js')
const potAlone = require('./alone.js')
const powHard = require('./potHard.js')
const proxy = require('./proxy.js')
module.exports = function(consensus, option = 'pot') {
  switch(consensus)  {
    case "pot": return potSimple
    case "pow": return pow
    case "potHard": return powHard
    case "potAlone": return potAlone
    case "proxy": return proxy(option)
  }
}