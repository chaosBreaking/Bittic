var Ling = wo.Ling

/******************** Public of instance ********************/

const DAD=module.exports=function Chain(prop) {
  this._class=this.constructor.name
//  this.setProp(prop)
}
//DAD.__proto__=Ling
const MOM=DAD.prototype
//MOM.__proto__=Ling.prototype

/******************** Shared by instances ********************/

/*********************** Public of class *******************/
DAD.api={} // 面向前端应用的API

DAD._init=async function(){

  if (wo.Consensus){
    wo.Config.GENESIS_EPOCH= new Date('2018-04-17T06:15:00.000Z') // 为了方便开发，暂不使用固定的创世时间，而是生成当前时刻之后的第一个0秒，作为创世时间
  }

  await DAD.createGenesis()
  await DAD.verifyChainFromDb()
  if(wo.Config.Consensus==='ConsPow') {
    if(!wo.NetUDP.IsServer)   //暂时只都想这台服务器同步，如果是自己就不要同步了，
      await DAD.updateChainFromPeer_pow();
  }
  else
    await DAD.updateChainFromPeer();

  if (wo.Consensus){
    if(wo.NetUDP.IsServer) wo.Consensus._init()
  }else{
    DAD.gogogo()
  }
  
  return this
}

DAD.createGenesis=async function(){
  mylog.info('创世时分 GENESIS_EPOCH='+wo.Config.GENESIS_EPOCH.toJSON())
  my.genesis=new wo.Block({
    timestamp:wo.Config.GENESIS_EPOCH,
    message:'Some big things start out small'
  })
  await my.genesis.packMe([], null, wo.Crypto.secword2keypair(my.genesisAccount.secword))
  mylog.info('genesis is created and verified: '+my.genesis.verifySig())
//  mylog.info('genesis='); mylog.info(my.genesis)
  DAD.pushTopBlock(my.genesis)
  return my.genesis
}

DAD.verifyChainFromDb=async function(){ // 验证本节点已有的区块链
  console.log('开始验证数据库中的区块')
//  let top=(await wo.Block.getCount()).count
//  mylog.info('共有'+top+'个区块在数据库')
  await wo.Block.dropAll({Block:{height:'<='+wo.Config.GENESIS_HEIGHT}}) // 极端罕见的可能，有错误的（为了测试，手工加入的）height<创世块的区块，也删掉它。  
  let blockList=await wo.Block.getAll({Block:{height:'>'+my.topBlock.height}, config:{limit:100, order:'height ASC'}})
  while (Array.isArray(blockList) && blockList.length>0){ // 遍历数据库里的区块链，保留有效的区块，删除所有错误的。
    console.log('这一轮取出了'+blockList.length+'个区块')
    for (let block of blockList){
//      mylog.info('block of height '+ block.height +' is fetched')
      if (block.lastBlockHash===my.topBlock.hash && /*block.height===my.topBlock.height+1 && block.verifySig() && */ block.verifyHash())
      {
        console.log('block '+block.height+' is verified')
        if ( await block.verifyActionList() ){
          DAD.pushTopBlock(block)
          console.log('验证成功并加入了区块：'+block.height)
        }
        else {
          console.log('block '+block.height+' 验证失败！从数据库中删除...')
          await block.dropMe() // 注意，万一删除失败，会导致无限循环下去
        }
      }
      else
      {
        console.log('block '+block.height+' 验证失败！从数据库中删除...')
        await block.dropMe() // 注意，万一删除失败，会导致无限循环下去
      }

    }
// 万一还有 height=my.topBlock.height 的区块，需要先删除。因为下一步是直接获取 height>my.topBlock.height
// 此外，这一步很危险，如果height存在，hash不存在，那么无法删除；如果height不存在，那么会不会删除所有？？
    await wo.Block.dropAll({Block:{height:my.topBlock.height, hash:'!='+my.topBlock.hash}})
    blockList=await wo.Block.getAll({Block:{height:'>'+my.topBlock.height}, config:{limit:100, order:'height ASC'}})
  }
  console.log('...数据库中的区块验证完毕')

  if (my.topBlock.height===wo.Config.GENESIS_HEIGHT) {
    console.log('数据库中没有区块，所以清空事务和账户，并设立初始账户')
    await wo.Account.dropAll({Account:{version:'!=null'}})
    await wo.Action.dropAll({Action:{version:'!=null'}})
    await wo.Account.addOne({Account:{ balance: wo.Config.COIN_INIT_AMOUNT, address:my.initialAccount.address }})
    await wo.Account.addOne({Account:{ balance: 100000, address:"TkHUzjqgvpbGWecBKwTNoeoCdiQzcRpd1E" }})
  }

  return my.topBlock
}

DAD.Updating = false;
DAD.updateChainFromPeer=async function(blockList){ // 向其他节点获取自己缺少的区块；如果取不到最高区块，就创建虚拟块填充。
  //mylog('开始向邻居节点同步区块111111111' + new Date())
  DAD.Updating = true;
    if (Array.isArray(blockList) && blockList.length>0){
    for (let block of blockList){
      block=new wo.Block(block) // 通过 Peer 返回的是原始数据，要转换成对象。
      if (block.lastBlockHash===my.topBlock.hash && block.height===my.topBlock.height+1 /*&& block.verifySig()*/ && block.verifyHash()){
        await block.addMe()
        //// update actions of this block
        // if (Array.isArray(block.actionHashList) && block.actionHashList.length>0) { 
        //   var actionList = await wo.Peer.randomcast('/Block/getActionList', { Block:{ hash:block.hash, height:block.height } })
        //   for (let actionData of actionList) {
        //     var action=new wo[actionData.type](actionData)
        //     if (action.validate()) {
        //       await action.execute()
        //       await action.addMe()
        //     }
        //   }
        // }
        DAD.pushTopBlock(block)
        console.log('block '+block.height+' is updated')
      }else{ // 碰到一个错的区块，立刻退出
        console.log('block '+block.height+' 同步有错误！')
        var signalBadBlock=true
        DAD.Updating = false;
        break
      }

    }
     
  }

  DAD.Updating = false;
  //mylog('开始向邻居节点同步区块 2222222222')   
    //blockList=await wo.Peer.randomcast('/Block/getBlockList', { Block:{height:'>'+my.topBlock.height}, config:{limit:100, order:'height ASC'} })


  //return my.topBlock
}

DAD.UpdateBlock = async function(option){
  blockList = JSON.parse(option);
  //h = my.topBlock.height;
  for(let i = 0;i < blockList.length; i ++ ){
    await block.addMe();
    console.log('block '+block.height+' is updated');
    DAD.pushTopBlock(block);  
  }

}
/**
 * 先简单接收一下，双向验证待完成,先把所有区块全部要过来，
 * @param {*} option 
 */
DAD.updateChainFromPeer_pow=async function(option){ // 向其他节点获取自己缺少的区块；如果取不到最高区块，就创建虚拟块填充。
  mylog.info('开始向邻居节点同步区块')  
  return;
  msg = JSON.stringify({type:'getblocks',startHeight:my.topBlock.height})
  wo.NetUDP.serverUdp.send(msg,wo.Config.port,wo.NetUDP.serveraddress,(message)=>{
    wo.NetUDP.serverUdp.on('message',(msg,rinfo)=>{
          console.log(`receive blocks from ${rinfo.address}:${rinfo.port}`);          
              
          if(msg.type == 'block'){
            DAD.UpdateBlock(msg.data);
          }        
      });
  }) 
  
  mylog.info('...向邻居节点同步区块完毕');
  return my.topBlock
}

DAD.createBlock=async function(block){
  // block= (block instanceof wo.Block)?block:(new wo.Block(block)) // POT 里调用时，传入的可能是普通对象，需要转成 Block
  // block.message='矿工留言在第'+(my.topBlock.height+1)+'区块'
  // await block.packMe(wo.Action.actionPool, my.topBlock, wo.Crypto.secword2keypair(wo.Config.ownerSecword))
  // await block.addMe()
  // let winnerAccount = await wo.Account.getOne({Account:{address:wo.Crypto.pubkey2address(block.winnerPubkey)}})
  // if (winnerAccount) await winnerAccount.setMe({Account:{balance:winnerAccount.balance+block.rewardWinner},cond:{address:winnerAccount.address},excludeSelf:true})
  // let packerAccount = await wo.Account.getOne({Account:{address:wo.Crypto.pubkey2address(block.packerPubkey)}})
  // if (packerAccount) await packerAccount.setMe({Account:{balance:packerAccount.balance+block.rewardPacker},cond:{address:packerAccount.address},excludeSelf:true})  
  // DAD.pushTopBlock(block)
  // console.log(block.timestamp.toJSON() + ' : block '+block.height+' is created')
  return block
}

DAD.appendBlock=async function(block){ // 添加别人打包的区块
  block= (block instanceof wo.Block)?block:(new wo.Block(block)) // POT 里调用时，传入的可能是普通对象，需要转成 Block
  if (!my.addingLock&&(block.lastBlockHash===my.topBlock.hash && block.height===my.topBlock.height+1 && block.verifyHash())){
    my.addingLock = true    
    await block.addMe()
    DAD.pushTopBlock(block)
    //区块添加完毕后 释放锁
    my.addingLock = false 
    console.log("add " + block.timestamp.toJSON() + ' : block '+block.height+' is added')

    //广播一次
    //wo.NetUDP.Broadcast({type:'newblock',data:block})
    return block
  }
  return null
}


DAD.TestAdd = function(a,b){
  return a + b;
}

DAD.gogogo=async function(){
  setInterval(async function(){
    await DAD.createBlock()

    console.log(('  balance(initialAccount)='
       + await wo.Account.getBalance({Account:{address:my.initialAccount.address}})).cyan)
    
    // mylog.info(('  balance(ownerAccount)='
    //   + await wo.Account.getBalance({Account:{address:wo.Crypto.secword2address(wo.Config.ownerSecword)}})).cyan)

    // // 测试：模拟前端发来转账请求
    // if (my.topBlock.height===1 || my.topBlock.height===3){
    //   let action=new wo.ActTransfer({
    //     amount:18.8, 
    //     toAddress: wo.Config.ownerAccount.address
    //   })
    //   action.packMe(my.initialAccount)
    //   wo.Action.api.prepare({Action:action}) // 模拟前端调用 /Action/prepare 来提交事务。
    // }
    
  }, 5*1000) // wo.Config.BLOCK_PERIOD)
}

DAD.getTopBlock = DAD.api.getTopBlock = function(){
  return my.topBlock
}

DAD.pushTopBlock=function(topBlock){ // 保留最高和次高的区块
  my.lastBlock=my.topBlock
  my.topBlock=topBlock
}

/********************** Private in class *******************/

const my={
  genesis:{}
  ,
  topBlock:null // 当前已出的最高块
  ,
  lastBlock:null // 当前已出的次高块
  ,
  addingLock:false
  ,
//  keypair:null // 启动时，从配置文件里读出节点主人的secword，计算出公私钥
//  ,
  initialAccount:{ // 在height=0时创世账户获得初始币
    secword: 'window air repeat sense bring smoke legend shed accuse loan spy fringe',
    seckey: 'b868d41107363b20ee85e313f7494f534b29897f6a81cb62bad207a12b16397c5a5140259546c3b5179fe0ae179e2f87e0cd5dbe9cc1ecbaae2cde13708d8086',
    pubkey: '5a5140259546c3b5179fe0ae179e2f87e0cd5dbe9cc1ecbaae2cde13708d8086',
    address: 'Tkr8reV6FEySsgFPud29TGmBG4i2xW37Dw' // 'ACYKsUp5PLPcu53gHw37SzoFimhn1zMHQU'
  }
  ,
  genesisAccount:{ // 创建height=0创世块
    secword: "skill loyal dove price spirit illegal bulk rose tattoo congress few amount",
    pubkey: 'f6dd47bd4f31fdfd0024df4f63d266b12f788c54b9cc11f8f068215e75be6037',
    seckey: '57b3a55e4f3135a4a7086d74891b4b658f004ddba5ab11c928ab274b1b5835adf6dd47bd4f31fdfd0024df4f63d266b12f788c54b9cc11f8f068215e75be6037',
    address: 'TvfS4xjq25Nk1Y6xeb27CA7F7jfeKAPtR4' // 'ANMd5o4pAAnv2vuF2u35Bt9KaSfPKSMXfb'
  }
}
