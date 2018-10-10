const Ling = require('./_Ling.js')

class Tac extends Ling {
  constructor(prop){
    super(prop)
    Object.defineProperty(this, "_class", {
      value:"Tac",
      enumerable : true,
      writable : false
    })
    Object.defineProperty(Tac.prototype, "_model", {
      address:        { default:undefined, sqlite:'TEXT UNIQUE',      mysql:'VARCHAR(64) PRIMARY KEY' },
      name:           { default:undefined, sqlite:'TEXT UNIQUE',      mysql:'VARCHAR(256)' },
      symbol:         { default:undefined, sqlite:'TEXT',             mysql:'VARCHAR(256)' }, 
      version:        { default:undefined, sqlite:'TEXT' },
      decimals:       { default:1,         sqlite:'NUMERIC',          mysql:'BIGINT' },
      blockHash:      { default:undefined, sqlite:'TEXT',             mysql:'VARCHAR(64)' }, 
      totalSupply:    { default:0,         sqlite:'NUMERIC',          mysql:'BIGINT' },
      actorPubkey:    { default:undefined, sqlite:'TEXT',             mysql:'BINARY(32)' },
      actorAddress:   { default:undefined, sqlite:'TEXT',             mysql:'VARCHAR(50)' },
      actorSignature: { default:undefined, sqlite:'TEXT',             mysql:'BINARY(64)' },
      desc:           { default:undefined, sqlite:'TEXT',             mysql:'VARCHAR(256)' },
      option:         { default:undefined, sqlite:'TEXT',             mysql:'VARCHAR(4096)' },
    })
  }
  static async create(option){
    //先生成地址，校验和等
    return await (new Tac(option)).addMe()
  }
  static async transfer(option){
    return null
  }
  static async exchange(option){
    return null
  }
  static async mount(option){
    return null
  }
}
Object.defineProperty(Tac,'api',{
  value:{},
  enumerable:true,
})
Tac.api.getTac = async function (option) {
  return Tac.getAll(option)
}

module.exports = Tac