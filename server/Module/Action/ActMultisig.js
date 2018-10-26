const Action = require('./Action.js')

/******************** Public of instance ********************/

const DAD=module.exports=function ActMultisig(prop) {
  this._class=this.constructor.name
  this.setProp(prop) // 没有定义 DAD.prototype._model，因此继承了上级Action.prototype._model，因此通过this.setProp，继承了上级Action定义的实例自有数据。另一个方案是，调用 Action.call(this, prop)
  this.type=this.constructor.name
}
DAD.__proto__= Action
// DAD._table=DAD.name // 注释掉，从而继承父类Action的数据库表格名
const MOM=DAD.prototype
MOM.__proto__=Action.prototype

MOM.signMe = function(seckey){ // 由前端调用，后台不该进行签名
    let json=this.getJson({exclude:['hash','blockHash','actorSignature','json']}) // 是前端用户发起事务时签字，这时候还不知道进入哪个区块，所以不能计入blockHash
    this.actorSignature=wo.Crypto.sign(json, seckey)
    return this
  }
  
MOM.verifySig = function(){
    let json=this.getJson(({exclude:['hash','blockHash','actorSignature','json']}))
    let res=wo.Crypto.verify(json, this.actorSignature, this.actorPubkey)
    return res
  }
  
MOM.verifyAddress = function(){
    return this.actorAddress===wo.Crypto.pubkey2address(this.actorPubkey)
  }
  
MOM.hashMe = function(){
    this.hash=wo.Crypto.hash(this.getJson({exclude:['hash', 'blockHash','json']})) // block.hash 受到所包含的actionList影响，所以action不能受blockHash影响，否则循环了
    return this
  }
  
MOM.verifyHash = function(){
    return this.hash===wo.Crypto.hash(this.getJson({exclude:['hash', 'blockHash','json']}))
  }

MOM.packMe = function(keypair){ // 由前端调用，后台不创建
    this.actorPubkey=keypair.pubkey
    this.actorAddress=wo.Crypto.pubkey2address(keypair.pubkey)
    this.timestamp=new Date()
    
    this.signMe(keypair.seckey)
    this.hashMe()
    return this
  }

MOM.checkMultiSig=function(account){
    let json = this.getJson(({exclude:['hash','blockHash','actorSignature','json']}))
    let sigers = Object.keys(this.json) //公钥列表
    //交易发起人的签名在prepare的verifySig里已经检查过合法性，
    if(account.multiSignatures.keysgroup.indexOf(this.actorPubkey)===-1) {
        let M = 1   //如果不在keysgroup里，可以把交易发起人算一个有效的签名，因此M从1算起
    }else {
        let M = 0   //如果发起人已经在keysgroup里则从0算起
    }
    for(let i of sigers)    //该交易内已签名的每一个公钥
    {
        if(account.multiSignatures.keysgroup.indexOf(i)!==-1 && wo.Crypto.verify(json, this.json[i], i))
        {
            M++
        }
    }
    return M >= account.multiSignatures.min
}
/******************** Shared by instances ********************/

/*
1.创建多重签名账户
{
    "ActMultisig":{
        "actorPubkey": "actorPubkey",
        "actorAddress": "actorAddress",
        "actorSignature":"actorSignature",
        "fee":1,
        "json":{
            act: "create",
            min: 2,
            lifetime: 10,   //暂时无用，因为每个交易的挂起时间需求可能不同
            keysgroup:[
                pubkey_a,
                pubkey_b,
                ...
                pubkey_n
            ]
        }
    }
}
2.多重签名账户交易
step1:发起一个多重签名账户的交易。该交易只是在缓存里，为了给多重签名账户的控制者们提供真正要写入区块链的源Action数据
{
    "ActMultisig":{
        "amount": 100,
        "fee": 1,
        "actorPubkey": "actorPubkey",
        "actorAddress": "actorAddress",
        "actorSignature":"actorSignature",
        "toAddress": "toAddress",
        "json":{
            act: "createTransfer",
            lifetime: 10,
        }
    }
}
step2:所有人签名
{
    "ActMultisig":{
        "amount": 100,
        "fee": 1,
        "actorPubkey": "actorPubkey",
        "actorAddress": "actorAddress",
        "actorSignature":"actorSignature",
        "toAddress": "toAddress",
        "json":{
            act: 'addSig',
            signature: 'signature',
        }
    }
}
step3:发起人申请执行
{
    "ActMultisig":{
        "amount": 100,
        "fee": 1,
        "actorPubkey": "actorPubkey",
        "actorAddress": "actorAddress",
        "actorSignature":"actorSignature",
        "toAddress": "toAddress",
        "json":{
            act:'emitTransfer'
            'pubkey1':'sig1',
            'pubkey2':'sig2',
            ......
            'pubkeyn':'sign',
        }
    }
}
*/
MOM.validator = async function(){
    if(this.json.act === 'createTransfer')  //创建挂起的多重签名事务
    {
        DAD.pendingPool[this.hash] = this
        return false
    } 
    else if(this.json.act === 'addSig') //签名者签名
    {
        DAD.pendingPool[this.hash].json[this.actorPubkey] = this.json.signature
        return false
    }
    else{
        return wo.Crypto.isAddress(this.toAddress)
        && this.fee >= wo.Config.MIN_FEE_ActTransfer
        && (await wo.Store.getBalance(action.actorAddress)) >= this.amount + this.fee   //Todo:引入缓存账户
        && this.toAddress != this.actorAddress
    }
}

MOM.execute=async function(){
    switch(this.json.act)
    {
        //多重签名账户注册
        case 'sign':
        {
            let actor = await wo.Account.getOne({Account: { address: this.actorAddress }})
            if(actor && actor.type !== 'multisig'){ 
                //检查账户类型，只有不是多重签名账户的才可以执行
                //todo:类型检查，安全操作
                await actor.setMe({Account:{ multiSignatures : {
                    min: this.json.min,
                    ttl: this.json.ttl, //该账户交易的最大挂起时间
                    keysgroup:this.json.keysgroup
                } }, cond:{ address:actor.address}})
            }
                return this
        }       
        //多重签名账户执行转账
        case 'emitTransfer':
        {
            let sender= await wo.Account.getOne({Account: { address: this.actorAddress}})
            if (sender && this.checkMultiSig(sender) && this.toAddress != this.actorAddress && sender.balance >= this.amount + this.fee){
                await sender.setMe({Account:{ balance: sender.balance-this.amount-this.fee }, cond:{ address:sender.address}})
                let getter= await wo.Account.getOne({Account: { address: this.toAddress}}) 
                if(getter){
                    await getter.setMe({Account:{ balance: getter.balance+this.amount }, cond:{ address:getter.address}})
                }
                else{
                    await wo.Account.addOne({Account: { address: this.toAddress}})
                }
                // mylog.info('Excecuted action='+JSON.stringify(this))
                delete DAD.pendingPool[this.hash]
                return this
            }
            
            // mylog.info('balance('+sender.address+')='+sender.balance+' is less than '+this.amount+', 无法转账')
            return null
        }

    }

}

DAD.pendingPool = {}    //存放所有待签名的多重签名账户交易

/*为挂起状态的多重签名交易提供查询服务 */
DAD.api.pendingAction = function(option){
    return DAD.pendingPool[option.id]
}