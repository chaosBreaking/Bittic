const Action = require('./Action.js')

/******************** Public of instance ********************/

const DAD=module.exports=function ActToken(prop) {
  this._class=this.constructor.name
  this.setProp(prop) // 没有定义 DAD.prototype._model，因此继承了上级Action.prototype._model，因此通过this.setProp，继承了上级Action定义的实例自有数据。另一个方案是，调用 Action.call(this, prop)
  this.type=this.constructor.name
}
DAD.__proto__= Action
// DAD._table=DAD.name // 注释掉，从而继承父类Action的数据库表格名
const MOM=DAD.prototype
MOM.__proto__=Action.prototype

/******************** Shared by instances ********************/


MOM.validate=function(){
  switch(this.json.act){
        case 'create':
            return this.fee>=0
        case 'transfer':
            return this.fee>=0
  }

//   &&wo.Crypto.isAddress(this.toAddress)  
//   &&this.toAddress != this.actorAddress
  // && wo.Account.accountPool[this.actorAddress].balance>this.amount+this.fee   //Todo:引入缓存账户

} 

/*
ActToken的不同类型操作基本依赖json内的具体内容
1.Token发行
{
    "ActToken":{
        "actorPubkey": "actorPubkey",
        "actorAddress": "actorAddress",
        "actorSignature":"actorSignature",
        "fee":1,
        "json":{
            act: "create",
            name: "xxx",
            symbol: "xxx",
            decimals: 1,
            totalSupply: 100000 
        }
    }
}
2.Token转账
{
    "ActToken":{
        "amount": 100,
        "fee": 1,
        "actorPubkey": "actorPubkey",
        "actorAddress": "actorAddress",
        "actorSignature":"actorSignature",
        "toAddress": "toAddress",
        "json":{
            'act': "transfer",
            'name': "xxx",
            'symbol': "xxx", 
        }
    }
}
*/
MOM.execute=async function(){
    if(this.validate())
        switch(this.json.act)
        {
            case 'create':
            {
                let token = new wo.Token(wo.Tool.extend(this,this.json))
                let fundAccount = new wo.TokenAccount({token:this.json.name, symbol:this.json.symbol, address:this.actorAddress, balance:this.json.totalSupply})
                let actor = await wo.Account.getOne({Account: { address: this.actorAddress }})
                try{
                    await token.addMe()
                    await fundAccount.addMe()
                }
                catch(err){
                    mylog.warn(err)
                    return 0
                }
                await actor.setMe({Account:{ balance: actor.balance-this.fee }, cond:{ address:actor.address}})
                return 1
            }
            case 'transfer':
            {
                let sender = await wo.TokenAccount.getOne({TokenAccount: { address: this.actorAddress, token: this.json.name, symbol:this.json.symbol}})
                let obj = await wo.Token.getOne({Token: { name: this.json.name, symbol: this.json.symble }})
                if (obj && sender && this.toAddress != this.actorAddress && sender.balance >= this.amount + this.fee){
                  await sender.setMe({TokenAccount:{ balance: sender.balance-this.amount-this.fee }, cond:{ address:sender.address, token: this.json.name, symbol:this.json.symbol}})
                  let getter= await wo.TokenAccount.getOne({TokenAccount: { address: this.toAddress, token: this.json.name, symbol:this.json.symbol }}) 
                  if(getter){
                      await getter.setMe({TokenAccount:{ balance: getter.balance+this.amount }, cond:{ address:getter.address, token: this.json.name, symbol:this.json.symbol}})
                  }
                  else{
                      await wo.TokenAccount.addOne({TokenAccount: { address: this.toAddress, token: this.json.name, symbol:this.json.symbol, balance: this.amount}})
                  }
                  // mylog.info('Excecuted action='+JSON.stringify(this))
                  return this
                }
                // mylog.info('balance('+sender.address+')='+sender.balance+' is less than '+this.amount+', 无法转账')
                delete wo.Consensus.currentActionPool[this.hash] //无法执行的交易需要删除，不能被写入Action
                return null
            }
            case 'deposit':
            {
                return null
            }
        }

}

