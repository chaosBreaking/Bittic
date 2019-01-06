'use strict'
/**
 * 此代理将Worker(链及服务)进程收到的共识API调用转发到共识进程
 */
module.exports = (consName) => {
  if (consName === 'pot') {
    return potProxy
  }
}
const potProxy = {
  api: {
    signWatcher: async (option) => {
      return await wo.EventBus.call('Consensus', 'api', 'signWatcher', option.Consensus || {})
    },
    electWatcher: async (option) => {
      return await wo.EventBus.call('Consensus', 'api', 'electWatcher', option.Consensus || {})
    },
    mineWatcher: async (option) => {
      return await wo.EventBus.call('Consensus', 'api', 'mineWatcher', option.Consensus || {})
    },
    shareWinner: async () => {
      return await wo.EventBus.call('Consensus', 'api', 'shareWinner')
    },
    test: async () => {
      return await wo.EventBus.call('Consensus', 'api', 'test')
    }
  }
}
