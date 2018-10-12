module.exports = async function (message) {
  if (message && message.code) {
    switch (message.code) {
      //子进程处理Master触发的事件
      case 100: //[Master] 启动共识
        mylog.warn('[Worker] 100 -- 主进程启动共识');
        return 0;
      case 110: //[Master] 签名阶段
        return 0;
      case 120: //[Master] 竞选阶段
        mylog.info('广播本节点的赢家的预签名空块--' + message.data.hash);
        wo.Peer.broadcast('/EventBus/remoteCall', {who:'Consensus',api:'api',act:'electWatcher',param:{Block:JSON.stringify(message.data)}});
        return 0;
      case 130: //[Master] 出块阶段
        mylog.info('[Worker]: 收到出块阶段预告')
        return 0;
      case 'get':
        let res = message.data.api ? wo[message.data.who]['api'][message.data.act](message.data.param)
          : wo[message.data.who][message.data.act](message.data.param)
        return await wo.Store.storeAPI.setKey(message.data.id, JSON.stringify(res));
      case 'call':  //内部函数调用
        message.data.api ? wo[message.data.who]['api'][message.data.act](message.data.param)
          : wo[message.data.who][message.data.act](message.data.param)
        return 0;
    }
  }
  return 0;
}