var Ling = wo.Ling

/******************** Public members of instance ********************/

const DAD=module.exports=function Token(prop) { // 构建类
  this._class=this.constructor.name
  this.setProp(prop)
}
DAD.__proto__=Ling
DAD._table=DAD.name
const MOM=DAD.prototype // 原型对象
MOM.__proto__=Ling.prototype

/******************** Public members shared by instances ********************/
MOM._tablekey='hash'
MOM._model= {   
    hash:           { default:undefined, sqlite:'TEXT UNIQUE',      mysql:'VARCHAR(64) PRIMARY KEY' }, // 不纳入签名和哈希
    version:        { default:0,         sqlite:'INTEGER' },
    blockHash:      { default:undefined, sqlite:'TEXT',             mysql:'VARCHAR(64)' }, // 不纳入签名和哈希。只为了方便查找
    name:           { default:undefined, sqlite:'TEXT UNIQUE',      mysql:'VARCHAR(256)' },
    symbol:         { default:undefined, sqlite:'TEXT',             mysql:'VARCHAR(256)' },  // toAddress:      { default:undefined, sqlite:'TEXT',     mysql:'VARCHAR(50)' },
    decimals:       { default:1,         sqlite:'NUMERIC',          mysql:'BIGINT' },
    totalSupply:    { default:0,         sqlite:'NUMERIC',          mysql:'BIGINT' },
    actorPubkey:    { default:undefined, sqlite:'TEXT',             mysql:'BINARY(32)' },
    actorAddress:   { default:undefined, sqlite:'TEXT',             mysql:'VARCHAR(50)' },
    actorSignature: { default:undefined, sqlite:'TEXT',             mysql:'BINARY(64)' }, // 不纳入签名，纳入哈希
    transactions:   { default:{},        sqlite:'TEXT' },
    desc:           { default:undefined, sqlite:'TEXT',             mysql:'VARCHAR(256)' },
    option:         { default:undefined, sqlite:'TEXT',             mysql:'VARCHAR(4096)' },
    json:           { default:{},        sqlite:'TEXT' } // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
  }


DAD.api = {}

DAD.api.getTokenList=async function(option){
    return await DAD.getAll(option)
}

DAD.api.getToken=async function(option){
    info = await DAD.getOne(option)
    if(info)
        return {hash:info.hash,name:info.name,symbol:info.symbol,decimals:info.decimals,totalSupply:info.totalSupply,actorAddress:info.actorAddress,desc:info.desc}
}
