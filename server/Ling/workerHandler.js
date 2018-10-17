module.exports = async function (message) {
  if (message && message.code) {
    switch (message.code) {
      //子进程处理Master触发的事件
      case 'emit':
        let res = message.data.api ? wo[message.data.who]['api'][message.data.act](message.data.param)
          : wo[message.data.who][message.data.act](message.data.param)
      case 'call':  //内部函数调用
        let callres = message.data.api ?await wo[message.data.who]['api'][message.data.act](message.data.param)
          :await wo[message.data.who][message.data.act](message.data.param)
        wo.EventBus.send(callres);
        return 0;
    }
  }
  return 0;
}