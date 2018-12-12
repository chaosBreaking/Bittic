// const mylog = require('./Logger.js')
const fs = require('fs')

class MissionPool {
  constructor(option = {}) {
    Object.defineProperty(this, 'storePool', {
      value: {},
      enumerable: false,
      writable: false
    })
    mylog.warn('MissionPool inited')
  }
  static getInstance(option) {
    if(!MissionPool.instance) {
      MissionPool.instance = new MissionPool(option)
    }
    return MissionPool.instance
  }
  addMission(missionId, mission) {
    if(mission && missionId){
      this.storePool[missionId] = mission
      return true
    }
  }
  deleteMission(missionId) {
    if(missionId && this.storePool[missionId]) {
      mylog.info('---- 任务删除 ----')
      return delete this.storePool[missionId]
    }
  }
  getMission(missionId = '') {
    return this.storePool[missionId]
  }
}
// class ChainPool {
//   constructor() {

//   }
//   static init() {
//     let chainPool = ChainPool.getInstance()
//     return new Promise((resolve, reject) => {
//       fs.readFile('./nodeInfo.json', (err, res) => {
//         if(err) {
//           fs.writeFile('./nodeInfo.json', JSON.stringify({}), () => {
//               mylog.info('Init new dump file')
//               chainPool.storePool = {}
//               return resolve(chainPool)
//             }
//           )
//         }
//         else {
//           chainPool.storePool = res.toString()
//           return resolve(chainPool)
//         }
//       })
//     })
//   }
//   static getInstance() {
//     if(!ChainPool.instance) {
//       ChainPool.instance = new ChainPool()
//     }
//     return ChainPool.instance
//   }
//   getChain(chainId) {

//   }
//   addChain(chainId, chain) {

//   }
//   registChain() {

//   }
//   countChain() {
    
//   }
// }
module.exports = {
  MissionPool,
  // ChainPool
}