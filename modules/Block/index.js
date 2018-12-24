const blockAlone = require('./Block.js')
const blockPot = require('./Block.js')
const blockPow = require('./BlockPow.js')
module.exports = (consensus) => {
  switch(consensus) {
  	case 'alone': return blockAlone
    case 'pot': return blockPot
    case 'pow': return blockPow
  }
}