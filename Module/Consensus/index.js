const potSimple = require('./pot.js')
const pow = require('./pow.js')
const powHard = require('./potHard.js')
const potAlone = require('./alone.js')
module.exports = function(consensus) {
  switch(consensus)  {
    case "pot": return potSimple
    case "pow": return pow
    case "potHard": return powHard
    case "potAlone": return potAlone
  }
}