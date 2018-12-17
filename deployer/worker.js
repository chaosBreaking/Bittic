const events = require('events')
const { writeFileAsync, execAsync, getConfigData } = require('./util.js')
const step1 = 'analysing'
const step2 = 'generating config files'
const step3 = 'generating project package'
const step4 = 'starting blockchain'
class Mission extends events {
  constructor(missionId, data) {
    super()
    this.missionId = missionId
    this.data = data
    this.process= 0
    this.step = step1
  }
  /**
   * 部署完毕
    this.emit('finished',{
      //chainInfo 部署的区块链的信息
      chainName: 'TIC',
      port: 6842,
      consPort: 6888,
      p2pPort: 60842
    })
    更新进度
    this.emit('update',this.process)
   *
   * @returns
   * @memberof Mission
   */
  start() {
    this.emit("update", step2);
    //1.创建工程文件夹
    execAsync(`mkdir ${this.missionId}`)
    //2.生成配置文件
    .then(() => {
      this.emit("update", step3);
      writeFileAsync(`./${this.missionId}/configSys.js`, getConfigData(this.data))
      mylog.info(`[${this.missionId}]: 配置文件生成完毕`)
    }).catch((err) => {mylog.error('配置文件生成失败')})
    //3.向主网注册
    .then(() => {
      mylog.info('主网注册成功')
      mylog.info(this.data.nodes)
      let chainInfo = {
        name: this.data.name,
        tag: "tic-test"
      }
    }).catch((err) => {mylog.error('区块链启动失败')})
    //4.启动区块链
    .then(() =>{
      // execAsync(`cd ./${this.missionId} && pm2 start ../server.js --name ${this.missionId} --no-autorestart`)
      this.emit('finished', chainInfo)
    }).catch((err) => {mylog.error('工程文件生成失败')})
    return this
  }
}
/**
 * 创建部署任务，返回一个可监听对象。
 * 当部署进度更新时，会触发update事件
 * 当部署完成时，会触发finished事件
 * @param {*} missionId
 * @param {*} mission
 * @returns {Mission} mission
 */
function deploy(missionId, mission) {
  //mission -> orderBody
  mylog.info('创建任务......')
  let newMission = new Mission(missionId, mission).start()
  return newMission
}

module.exports = {
  deploy
}