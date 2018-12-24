const pow = require('./pow.js')
const potSimple = require('./pot.js')
const alone = require('./alone.js')
const potHard = require('./potHard.js')
const proxy = require('./proxy.js')
module.exports = function(consensus, option = 'pot') {
  switch(consensus)  {
    case "pot": return potSimple
    case "potHard": return powHard
    case "pow": return pow
    case "alone": return alone
    case "proxy": return proxy(option)
  }
}