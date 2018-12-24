const blockPot = require('./Block.js')
const blockPow = require('./BlockPow.js')
module.exports = (consensus) => {
  switch(consensus) {
    case 'pot': return blockPot;
    case 'pow': return blockPow;
  }
}