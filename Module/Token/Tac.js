const Ling = require('../../Ling/_Ling.js')

class Tac extends Ling {
  constructor(prop){
    super(prop);
    this.setProp(prop);
    this._tablekey = 'address';
  }
  static async create(option){
    //先生成地址，校验和等
    let tac = new Tac(option);
    Object.assign(tac, option.data);
    tac.address = wo.Crypto.pubkey2address(wo.Crypto.hash(option.actorPubkey,option.hash));
    return await tac.addMe();
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
Object.defineProperty(Tac.prototype, "_class", {
  value:"Tac",
  enumerable : true,
  writable : false
});
Object.defineProperty(Tac.prototype, "_model", 
{
  value: {
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
    describe:       { default:undefined, sqlite:'TEXT',             mysql:'VARCHAR(256)' },
    timestamp:      { default:undefined, sqlite:'TEXT',             mysql:'VARCHAR(256)' },
    ACL:            { default:undefined, sqlite:'TEXT',             mysql:'VARCHAR(256)' },
    meta:           { default:undefined, sqlite:'TEXT',             mysql:'VARCHAR(256)' },
  },
  enumerable:true,
  writable:false
});
Object.defineProperty(Tac,'_table',{
  value:'Tac',
  enumerable:true
})
Object.defineProperty(Tac,'api',{
  value:{},
  enumerable:true
})
Tac.api.getTac = async function (option) {
  return await Tac.getAll(option);
}

module.exports = Tac