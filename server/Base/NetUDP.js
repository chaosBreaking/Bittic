/* ************************************
Udp 通讯    将upd与tcp结合使用，请求大量数据时建立一个tcp连接，
********************************* */
/**
 * Udp 通讯    将upd与tcp结合使用，请求大量数据时建立一个tcp连接，
 * msg : {type:type,data:data}
 */

var ip = require('ip');
var os = require('os');


/*udp server*/
const dgram = require('dgram');
//HashTable = require('./HashTable.js');

function NetUDP(){ 
    this.name1 = 'test1';
    //对象方法
    this.show = function(){
      console.log(this.name1);
    }  
}

//类方法 静态方法
//NetUDP.peerPool = []; //active, activeTime,address,port,
NetUDP.serverUdp = dgram.createSocket('udp4');

/**
 * key:address:port
 * value: active,activeTime,address,port,
 */
NetUDP.peerPool = new Object();   
NetUDP.IsPrivateAddress = true;
NetUDP.serveraddress = "211.149.202.103"; 
NetUDP.IsServer = false;
NetUDP.myaddress = null;

NetUDP.bNeedUpdateBlock = true; 

NetUDP._init = function(Interval = 5000){    
    NetUDP.serverUdp.bind(wo.Config.port);
    setInterval(NetUDP.BroadcastPulse,Interval);

    NetUDP.myaddress = NetUDP.getIPAdress();
    NetUDP.IsPrivateAddress = ip.isPrivate(NetUDP.myaddress);
    dd = NetUDP.getPublicIp()
    
    NetUDP.IsServer = (NetUDP.serveraddress == NetUDP.myaddress)   
    port = wo.Config.port;
    key = NetUDP.serveraddress + ':' + port;
    if(!NetUDP.IsServer)  NetUDP.peerPool[key] =  {active:true, activeTime:new Date(),address:NetUDP.serveraddress,port:port};

    NetUDP.bNeedUpdateBlock = !NetUDP.IsServer; //暂时
    //更新数据
    setInterval(function(){  //以后改为，随机从节点池中的节点获取，
        if(NetUDP.bNeedUpdateBlock){
            lastBlock = wo.Chain.getTopBlock();
            message = {type:'getblocks',data:{startHeight:lastBlock.height,count:10}};
            NetUDP.serverUdp.send(JSON.stringify(message),wo.Config.port,NetUDP.serveraddress);  
        }
    },5000)

    // NetUDP.serverUdp.send('22222',3366,'211.149.202.103',(message)=>{
    //     NetUDP.serverUdp.on('message',(msg,rinfo)=>{
    //         console.log(`receive message from ${rinfo.address}:${rinfo.port}`);
    //         //UpdatePool(msg);
    //         //NetUDP.serverUdp.send('exit',rinfo.port,rinfo.address)
    //         console.log(msg.toString());
    //         //msg = JSON.parse(msg);
    //         // if(msg.type == 'peer'){
    //         //     NetUDP.UpdatePool(msg);
    //         // }
                
    //         if(msg.type == 'block'){
    //             //NetUDP.UpdateBlock(msg);
    //         }        
    //     });
    // })
}


NetUDP.serverUdp.on('message',async (msg,rinfo)=>{
    //console.log(`receive message from ${rinfo.address}:${rinfo.port}`);
    //serverUdp.send('exit',rinfo.port,rinfo.address)
    //console.log(msg.toString());
    msg = JSON.parse(msg);
    
    NetUDP.UpdatePeerPool(msg,rinfo);
    if(msg.type == 'pulse' || msg.type == 'peer'){
        //NetUDP.UpdatePeerPool(msg,rinfo);
        if(msg.data.height < wo.Chain.getTopBlock.height){ //            

        }
    }
    else if(msg.type == 'blocks'){  //接到其它节点发来的blocks数据，并更新数据
        if( !wo.Chain.Updating){
            wo.Chain.updateChainFromPeer(msg.data); //NetUDP.UpdateBlock(msg.data);
        }
       d = 0
    }
    else if(msg.type == 'getblocks'){   //接到其它节点响应请求blocks数据，并发送数据，
        data = await wo.Block.api.getBlockList({ Block:{height:'>'+msg.data.startHeight}, config:{limit:msg.data.count>100 ? 100:msg.data.count, order:'height ASC'} })
        message = {type:'blocks',data:data};
        NetUDP.serverUdp.send(JSON.stringify(message),rinfo.port,rinfo.address);
    }  
    else if(msg.type == 'newblock'){ //接到新挖矿广播的block
        lastBlock = wo.Chain.getTopBlock();        
        console.log(`From 000 ${rinfo.address}:${rinfo.port}` + "new block Height:" + msg.data.height )
        if (lastBlock.height + 1 == msg.data.height) {
            NetUDP.bNeedUpdateBlock = false;
            wo.Chain.appendBlock(msg.data);
            console.log(`From ${rinfo.address}:${rinfo.port}` + "new block Height:" + msg.data.height )

            // wo.Consensus._init();  //待改进，
        }
        //else if(lastBlock.height >= msg.data.height){} //自己产生的区块，广播返回了，
        else{  //向其它节点申请blocks数据，
            if(lastBlock.height + 2 < msg.data.height)     NetUDP.bNeedUpdateBlock = true;
            //message = {type:'getblocks',data:{startHeight:lastBlock.height,count:100}};
            //NetUDP.serverUdp.send(JSON.stringify(message),rinfo.port,rinfo.address);  
        }

        // wo.Chain.appendBlock()
        // await block.addMe();
        // wo.Chain.pushTopBlock(block)

        // message = {type:'block',data:bk.api.getBlockList({ Block:{height:'>'+msg.startheight}, config:{limit:500, order:'height ASC'} })};
        // NetUDP.serverUdp.send(JSON.stringify(message),rinfo.port,rinfo.address);
    }   
    else if(msg.type == 'getpeer'){
        key = rinfo.address + ':' + rinfo.port;
        message = {type:'peer',data:{selfkey:key,peerPool:NetUDP.peerPool}}
        NetUDP.serverUdp.send(JSON.stringify(message),rinfo.port,rinfo.address);
    }          
});

/**
 * 请求Blocks
 */
NetUDP.GetBlock = function(startHeight,port,address,cnt = 50){
    data = JSON.stringify({type:'getblocks',height:startHeight,count:cnt});
    NetUDP.serverUdp.send(data,port,address);
}

//NetUDP.bConnectServer = true;
/**
 * 广播pulse报文，如果连接节点少于3个，就发送请求，
 */
NetUDP.BroadcastPulse = function(){

    //判断连接状态，待整理成函数,大于10个peer，再进行判断清理，
    size = 0;
    for(var k in NetUDP.peerPool) size ++;
    if(size > 10){   //如果连接节点多于10个就管理一下节点，
        for(var k in NetUDP.peerPool){
            if( (new Date() - NetUDP.peerPool[k].activeTime ) > 20 * 1000){
                delete(NetUDP.peerPool[k]);
            }
            else if( (new Date() - NetUDP.peerPool[k].activeTime ) > 10 * 1000){
                NetUDP.peerPool[k].active = false;
            }
        }
    }

    message = JSON.stringify({type:'pulse', data:{height:wo.Chain.getTopBlock.height} });
    var size = 0;
    for(var k in NetUDP.peerPool) size ++;
    if(size < 5) message = JSON.stringify({type:'getpeer', data:{height:wo.Chain.getTopBlock.height} });   //如果peers小于5就请求获取peers，否则发pulse
    
    for(var k in NetUDP.peerPool){
        //if(NetUDP.peerPool[k].port != 6842 || NetUDP.bConnectServer){
            //NetUDP.bConnectServer = false;
            NetUDP.serverUdp.send(message,NetUDP.peerPool[k].port, NetUDP.peerPool[k].address); //要activeTime
        //}
    }     
}


NetUDP.getPublicIp = function() {
    var publicIp = null;
    try {
      var ifaces = os.networkInterfaces();
      Object.keys(ifaces).forEach(function (ifname) {
        ifaces[ifname].forEach(function (iface) {
          if ('IPv4' !== iface.family || iface.internal !== false) {
            // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
            return;
          }
          if (!ip.isPrivate(iface.address)) {
            publicIp = iface.address;
          }
        });
      });
    } catch (e) {
        a = 0;
    }
    return publicIp;
  }

NetUDP.getIPAdress = function(){  
    var interfaces = require('os').networkInterfaces();  
    for(var devName in interfaces){  
          var iface = interfaces[devName];  
          for(var i=0;i<iface.length;i++){  
               var alias = iface[i];  
               if(alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal){  
                     return alias.address;  
               }  
          }  
    }  
} 
NetUDP.serverUdp.on('close',()=>{
    console.log('socket已关闭');
});

NetUDP.serverUdp.on('error',(err)=>{
    console.log(err);
});

NetUDP.serverUdp.on('listening',()=>{
    console.log('socket正在监听中...');
});


/**
 * option = {type:block,data:blocklist}  暂未使用，
 */
NetUDP.UpdateBlock = function(option){
    wo.Chain.updateChainFromPeer(option);
}

/**
 * 
 * @param {*} msg  
 *            type:'peer'  data:{selfkey:selfkey,peerPool:peerPool}
 * @param {*判断是否是一个新的连接} rinfo 
 */
NetUDP.UpdatePeerPool = function(msg,rinfo,updatePeers = false){  

    key = rinfo.address + ':' + rinfo.port;
    if(key in NetUDP.peerPool){
        NetUDP.peerPool[key].active = true;
        NetUDP.peerPool[key].activeTime = new Date();
    }
    else{        
        NetUDP.peerPool[key] = {active:true, activeTime:new Date(),address:rinfo.address,port:rinfo.port};
    }

    //msg = JSON.parse(msg);    
    recPeerPool = null;
    if(msg.type == 'peer'){
        key = msg.data.selfkey;
        recPeerPool = msg.data.peerPool;
        if(key in recPeerPool){
            delete(recPeerPool[key]);
        }        

        for(var k in recPeerPool){
            if(k in NetUDP.peerPool){}
            else{
                //if( (!NetUDP.IsPrivateAddress) || (NetUDP.IsPrivateAddress && recPeerPool[k].port == wo.Config.port) ){
                if( recPeerPool[k].port == wo.Config.port ){
                    NetUDP.peerPool[k] = recPeerPool[k];   //要注意改变下activeTime
                }
            }
        }
    }
}

/**
 * 广播 block，action，peerTabPool(去掉)
 * @param {*} option 
 */
NetUDP.Broadcast = function(option){
    size = 0;for(var k in NetUDP.peerPool) size ++;
    if(option && size > 0){
        if(typeof(option) != 'string') option = JSON.stringify(option);

        for(var k in NetUDP.peerPool){
            NetUDP.serverUdp.send(option,NetUDP.peerPool[k].port, NetUDP.peerPool[k].address);
        }
    }    
}


//原型方法
NetUDP.prototype.show2 = function(){
    console.log('show2');
    //console.log(name);
    console.log(Test.name);
    console.log(this.name1);
}
  
NetUDP.prototype.Add2 = function(a,b){
    return 10*a+b;
}

// Export
module.exports = NetUDP;







//阻塞接收
// NetUDP.serverUdp.send('22222',3366,'211.149.202.103',(message)=>{
//     NetUDP.serverUdp.on('message',(msg,rinfo)=>{
//         console.log(`receive message from ${rinfo.address}:${rinfo.port}`);
//         //UpdatePool(msg);
//         //NetUDP.serverUdp.send('exit',rinfo.port,rinfo.address)
//         console.log(msg.toString());
//         //msg = JSON.parse(msg);
//         // if(msg.type == 'peer'){
//         //     NetUDP.UpdatePool(msg);
//         // }
            
//         if(msg.type == 'block'){
//             NetUDP.UpdateBlock(msg);
//         }        
//     });
// })
//serverUdp.send('88888',3366,'211.149.202.103')


// idx = 0;
// TestTicUdp_client=async function(){
//    //getFunctionName()
//    idx = idx  +1;
//    console.log('**********' + idx + '**********' + new Date())
//    clientUdp.send(`hello From udpclient` + idx.toString(),8060,'192.168.16.172');   
//    clientUdp.send(`hello From udpclient` + idx.toString(),8060,'211.149.202.103');
// }
//setInterval(TestTicUdp_client,2000);