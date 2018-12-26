// 共识模块  POW 
// 分叉：采用长链原则，最小hash原则，固定hash校对，

/******************** Public of instances ********************/

const DAD=module.exports=function ConsPow(prop) {
  this._class=this.constructor.name
//  this.setProp(prop)
}
//DAD.__proto__=Ling
const MOM=DAD.prototype
//MOM.__proto__=Ling.prototype

/******************** Shared by instances ********************/

/*********************** Public of class *********************/
var test = 5;
module.exports.test = test;
DAD.api={}

BigNumber=require('bignumber.js') 

/**
 * 后面将难度细化改进为 2^256
 * @param {target hash} hash 
 * @param {difficult} difficult 
 */
DAD.CheckProofOfWork = function(hash,difficult){ 
  //has2 = 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF';
  //for(var i=0;i<difficult;i++) has2[i] = '0';
  difficult = difficult || 0;
  has2 = '0'.repeat(difficult) + 'F'.repeat(64-difficult);
  rlt = new BigNumber(hash,16).minus(new BigNumber(has2,16)).toString(16)

  if(rlt > '0'){
    return false;
  }
  else{
    return true;
  }
}

DAD._init1=async function(){  
  
  //jxcore.tasks.addTask(DAD._init0);
  return;
  if(false){
    wo.NetUDP._init();
    //udp.serverUdp.send('9999',3366,'211.149.202.103')
  
    //lastBlock = wo.Chain.getTopBlock();
    //data = JSON.stringify(lastBlock);
    //return;
    let blockList=await wo.Block.getAll({Block:{height:'>'+0}, config:{limit:100, order:'height ASC'}})
    data = JSON.stringify(blockList);
    wo.NetUDP.serverUdp.send(data,3366,'211.149.202.103')

    return;
    wo.NetUDP.serverUdp.send('hello22',3366,'211.149.202.103',(message)=>{
      wo.NetUDP.serverUdp.on('message',(msg,rinfo)=>{
            console.log(`888888899999 receive message from ${rinfo.address}:${rinfo.port}`);
            //UpdatePool(msg);
            //NetUDP.serverUdp.send('exit',rinfo.port,rinfo.address)
            console.log('888888899999' + msg.toString());
            //msg = JSON.parse(msg);
            // if(msg.type == 'peer'){
            //     NetUDP.UpdatePool(msg);
            // }
                
            if(msg.type == 'block'){
                //NetUDP.UpdateBlock(msg);
            }        
        });
    })


  }
  else {
    while(true)
    { 
      lastBlock = wo.Chain.getTopBlock();
      difficult = 4;//lastBlock.difficult;  //后面设置成根据时间调整难度，最终2分钟左右出一个块，
      var block=new wo.Block({type:'powBlock', timestamp:new Date(), height:lastBlock.height+1, lastBlockHash:lastBlock.hash})   
      await block.packMe(wo.Action.actionPool,lastBlock,wo.Crypto.secword2keypair(wo.Config.ownerSecword));
      while(!DAD.CheckProofOfWork(block.hashMe().hash,difficult))
      {
        block.nonce ++;
        if(block.nonce % 100000 == 0) {
          console.log(new Date() + '----' + block.nonce);
          if(lastBlock.height >= block.height){
            block=new wo.Block({type:'powBlock', timestamp:new Date(), height:lastBlock.height+1, lastBlockHash:lastBlock.hash})   
            await block.packMe(wo.Action.actionPool,lastBlock,wo.Crypto.secword2keypair(wo.Config.ownerSecword));
          }
        }
      }
      await block.addMe();
      wo.Chain.pushTopBlock(block)
      mylog.info('generate new block Height:' + block.height + '****' + new Date());

      //广播
      wo.NetUDP.Broadcast({type:'newblock',data:block});      
    }  
  }

}



DAD.bInit = false;   //需要启动服务器上主节点程序
DAD._init=async function(){  

  //return;
  if(!DAD.bInit)
  {
    DAD.bInit = true;
  }
  else return;
  //return;
  lastBlock = wo.Chain.getTopBlock();
  difficult = 4;//lastBlock.difficult;  //后面设置成根据时间调整难度，最终2分钟左右出一个块，
  var block=new wo.Block({type:'powBlock', timestamp:new Date(), height:lastBlock.height+1, lastBlockHash:lastBlock.hash})   
  await block.packMe(wo.Action.actionPool,lastBlock,wo.Crypto.secword2keypair(wo.Config.ownerSecword));

  setInterval(async function(){
    
    block.timestamp = new Date();
    lastBlock = wo.Chain.getTopBlock();
    
    if (lastBlock.height >= block.height){      
      block=new wo.Block({type:'powBlock', timestamp:new Date(), height:lastBlock.height+1, lastBlockHash:lastBlock.hash})   
      await block.packMe(wo.Action.actionPool,lastBlock,wo.Crypto.secword2keypair(wo.Config.ownerSecword));
      return;
    } 

    // block.height = lastBlock.height + 1;
    // block.lastBlockHash = lastBlock.hash;
    block.nonce = 0;    
    for(var i = 0; i < 400; i++)
    {
      block.nonce++;
      if( DAD.CheckProofOfWork(block.hashMe().hash,difficult)){
        lastBlock = wo.Chain.getTopBlock();
        if (lastBlock.height >= block.height)   break;
        await block.addMe();
        wo.Chain.pushTopBlock(block)
        console.log('generate new block Height:' + block.height + ' --' + new Date());

        //广播
        wo.NetUDP.Broadcast({type:'newblock',data:block});  
        lastBlock = block; 
        block=new wo.Block({type:'powBlock', timestamp:new Date(), height:lastBlock.height+1, lastBlockHash:lastBlock.hash})   
        await block.packMe(wo.Action.actionPool,lastBlock,wo.Crypto.secword2keypair(wo.Config.ownerSecword));
        break;
      }
    }
  },300)
}
/********************** Private in class *********************/

const my={}
my.sigPool={}
my.bestSig
my.selfSig
my.pubkeyList= []
my.currentPhase
my.signBlock={} // 抽签块

// set: 集合，可以是数组或者对象，复数。  blocks, actions, blockSet, actionSet
// set 分为 List 数组，Dict 对象