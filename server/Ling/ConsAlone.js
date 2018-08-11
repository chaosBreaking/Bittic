// 共识模块

/******************** Public of instances ********************/

const DAD=module.exports=function ConsAlone(prop) {
  this._class=this.constructor.name
//  this.setProp(prop)
}
const MOM=DAD.prototype
//DAD.__proto__=Ling
//MOM.__proto__=Ling.prototype

/******************** Shared by instances ********************/

/*********************** Public of class *********************/

DAD.api={}

DAD._init=async function(){
  setInterval(async function(){
    await wo.Chain.createBlock()

    mylog.info('  balance(initialAccount)='
       + await wo.Account.getBalance({Account:{address:wo.Config.INITIAL_ACCOUNT.address}}))
    
    // mylog.info('  balance(ownerAccount)='
    //   + await wo.Account.getBalance({Account:{address:wo.Crypto.secword2address(wo.Config.ownerSecword)}}))

    // // 测试：模拟前端发来转账请求
    // if (my.topBlock.height===1 || my.topBlock.height===3){
    //  let action=new wo.ActTransfer({
    //    amount:18.8, 
    //    toAddress: wo.Crypto.secword2address(wo.Config.ownerSecword)
    //  })
    //   action.packMe(my.initialAccount)
    //   wo.Action.api.prepare({Action:action}) // 模拟前端调用 /Action/prepare 来提交事务。
    // }
    
  }, 5*1000) // wo.Config.BLOCK_PERIOD)
}

/********************** Private in class *********************/

const my={}

// set: 集合，可以是数组或者对象，复数。  blocks, actions, blockSet, actionSet
// set 分为 List 数组，Dict 对象