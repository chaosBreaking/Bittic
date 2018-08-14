const Ling=require('./_Ling.js')

const BigNumber=require('bignumber.js') // https://github.com/MikeMcl/bignumber.js  几个库的比较: node-bignum: 使用到openssl，在windows上需要下载二进制包，有时下载失败。bigi: 不错。 bignumber.js：不错。

const DAD=module.exports=function Bancor(model) { // 构建类
  this._class=this.constructor.name
  this.setProp(model)
  // this.crr=model.crr
  // this.poolBalance=model.poolBalance
  // this.poolSupply=model.poolSupply
}
DAD.__proto__=Ling
DAD._table=DAD.name
const MOM=DAD.prototype // 原型对象
MOM.__proto__=Ling.prototype

// CRR: constant reserve ratio 储备金率
// Money poolBalance 储备金池
// Token poolSupply 流通总量
MOM._model={ // 数据模型，用来初始化每个对象的数据
  hash:          { default:undefined, sqlite:'TEXT UNIQUE' },
  crr:           { default:1,          sqlite:'NUMERIC',     mysql:'VARCHAR(64) PRIMARY KEY' }, 
  poolBalance:       { default:1,          sqlite:'NUMERIC',     mysql:'INT' },
  poolSupply:        { default:1,          sqlite:'NUMERIC'},
  money:             { default:0,  sqlite:'NUMERIC'},
  token:             { default:0,  sqlite:'NUMERIC'},
  price:             { default:NaN,  sqlite:'NUMERIC'}
}
MOM._tablekey='hash'

MOM.checkPrice=function(){ // 查询当前价格
  return this.poolBalance/(this.crr*this.poolSupply)
}

MOM.buy=async function(option){ // 实际买入价和量
  option=option||{}
  if (option.money>0) {
    option.token=this.poolSupply*(Math.pow(1+option.money/this.poolBalance, this.crr)-1) // 花多少钱==>得到多少币
  }else if (option.token>0) {
    option.money=this.poolBalance*(Math.pow(1+option.token/this.poolSupply, 1/this.crr)-1) // 买多少币==>要花多少钱
  }else{
    if (option.usage==='EXEC'){ 
      return this
    }else {
      return {
        money:0, token:0, price:NaN, poolBalance:this.poolBalance, poolSupply:this.poolSupply
      }
    }
  }
  if (option.usage==='EXEC'){ 
    this.money=option.money
    this.token=option.token
    this.price=this.token/this.money
    this.poolBalance+=option.money
    this.poolSupply+=option.token
//    await this.addMe()
    return this
  }else { // 只返回计算的结果，用于测试，不改变储备金池、流通总量
    return {
      money:option.money,
      token:option.token,
      price:option.token/option.money,
      poolBalance:this.poolBalance+option.money,
      poolSupply:this.poolSupply+option.token
    }
  }
}

MOM.sell=async function(option){ // 实际卖出价和量
  option=option||{}
  if (option.money>0) {
    option.token=this.poolSupply*(1-Math.pow(1-option.money/this.poolBalance, this.crr)) // 收回多少钱==>卖出多少币
  }else if (option.token>0 && option.token<this.poolBalance) {
    option.money=this.poolBalance*(1-Math.pow(1-option.token/this.poolSupply, 1/this.crr)) // 卖出多少币==>收回多少钱
  }else{
    if (option.usage==='EXEC'){ 
      return this
    }else {
      return {
        money:0, token:0, price:NaN, poolBalance:this.poolBalance, poolSupply:this.poolSupply
      }
    }
  }
  if (option.usage==='EXEC'){ 
    this.money=option.money
    this.token=option.token
    this.price=this.token/this.money
    this.poolBalance-=option.money
    this.poolSupply-=option.token
//    await this.addMe()
    return this
  }else { // 只返回计算的结果，用于查询，不改变储备金池、流通总量
    return { 
      money:option.money, 
      token:option.token, 
      price:option.token/option.money,
      poolBalance:this.poolBalance-option.money, 
      poolSupply:this.poolSupply-option.token 
    }
  }
}

DAD.buy=async function(option){ // option里要提供一个bancor数模
  option=option||{}
  let bancor=new DAD(option.model)
  return await bancor.buy(option)
}
DAD.sell=async function(option){
  option=option||{}
  let bancor=new DAD(option.model)
  return await bancor.sell(option)
}

DAD.api={}

DAD.api.buy=async function(option){
  if (option && option.coinType && my[option.coinType] instanceof DAD){ // 前端指定了一个币种
    if (option.money) {
      return await my[option.coinType].buy(option)
    }else if (option.token) {
      return await my[option.coinType].buy(option)
    }
  }else if (option && option.model) { // 前端提供了一个bancor数模
    if (option.money) {
      return await DAD.buy(option)
    }else if (option.token) {
      return await DAD.buy(option)
    }
  }
  return null
}

my={}

my.TIC=new DAD({ crr:0.33, poolSupply:1200000000, poolBalance:1200000 })
// todo: 从数据库中读入该币种最新的模型数据
