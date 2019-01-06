const fs = require('fs')

class MissionPool {
  constructor (option = {}) {
    Object.defineProperty(this, 'storePool', {
      value: {},
      enumerable: false,
      writable: false
    })
    mylog.warn('MissionPool inited')
  }
  static getInstance (option) {
    if (!MissionPool.instance) {
      MissionPool.instance = new MissionPool(option)
    }
    return MissionPool.instance
  }
  addMission (missionId, mission) {
    if (mission && missionId) {
      this.storePool[missionId] = mission
      return true
    }
  }
  deleteMission (missionId) {
    if (missionId && this.storePool[missionId]) {
      mylog.info('---- 任务删除 ----')
      return delete this.storePool[missionId]
    }
  }
  getMission (missionId = '') {
    return this.storePool[missionId]
  }
}

module.exports = {
  MissionPool
}
