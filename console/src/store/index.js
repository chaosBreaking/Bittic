import Vue from 'vue'
import Vuex from 'vuex'
import * as modules from './modules'
import { app } from '../services'
import rootStore from './rootStore'

Vue.use(Vuex)

/**
 * @type {Store}
 */
const store = new Vuex.Store({
  modules: { ...modules },
  strict: app.dev,
  ...rootStore,
})

if (module.hot) {
  module.hot.accept(['./modules'], () => {
    const newModules = require('./modules')
    store.hotUpdate({
      modules: { ...newModules },
    })
  })
}

export default store
