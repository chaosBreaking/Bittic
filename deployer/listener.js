global.mylog = require('./Logger.js')
const io = require('socket.io-client')('ws://101.132.121.111:6057') //http://localhost:6842 http://101.132.121.111:6057
const nodeInfo = require('./nodeInfo.js')
const Worker = require('./worker.js')
const missionPool = require('./store.js').MissionPool.getInstance()
const chainMonitor = require('./chainMonitor.js')
function fitCheck(orderBody) {
  return orderBody.core <= nodeInfo.CORE &&
  orderBody.level === nodeInfo.LEVEL &&
  orderBody.ram <= nodeInfo.RAM &&
  orderBody.bound <= nodeInfo.BOUND && 
  !chainMonitor.hasChain()
}
io.on('connect',() => {
  //建立连接时进行注册
  io.emit('regist', nodeInfo)
})
io.on('message', (data) => {
  if (data.type === 'deploy') {
    //部署请求获得批准
    mylog.info('permission admitted,start deploy ', data.orderId)
    let mission = missionPool.getMission(data.orderId)
    mission.nodes = data.nodes
    Worker.deploy(data.orderId, mission)
    .on("update", (step) => {
      mylog.info(`进度更新[${data.orderId}]--${step}`)
    })
    .once("finished",() => {
      mylog.info('任务完成......')
      io.send({
        id: data.orderId, //控制端监听器id对应订单号
        type: 'emit',
        data: {
          type: 'feedback',
          status: 'finished',
          orderId: data.orderId,
          nodeInfo,
        }
      })
      missionPool.deleteMission(data.orderId)
    })
    .on('error', (errorMsg) => {
      io.send({
        id: data.orderId, //控制端监听器id对应订单号
        type: 'emit',
        data: {
          type: 'error',
          status: 'error',
          orderId: data.orderId,
          info: errorMsg
        }
      })
    })
  }
  if(data.type === 'deny') {
    //请求被拒绝
    mylog.info('permission denied! ', data.orderId)
    missionPool.deleteMission(data.orderId)
    return 0
  }
})
io.on('broadcast',(data) => {
  if(data.type === 'mission') {
    //新订单
    let acceptable = data.order && data.order.orderBody && !missionPool.getMission(data.order.orderId) && fitCheck(data.order.orderBody)
    if(acceptable){
      io.send({
        type: "emit", 
        id: data.order.orderId, 
        data: {
          type:'apply',
          orderId: data.order.orderId,
          nodeInfo
        } 
      })
      mylog.info('Mission available,waiting for permission')
      //只存储orderBody
      missionPool.addMission(data.order.orderId, data.order.orderBody)
    } else {
      mylog.info(`本机不满足订单条件，放弃接单`)
    }
  }
})