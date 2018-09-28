import Vue from 'vue'
import Vuex from 'vuex'
import chain from './chain'
import market from './market'
import network from './network'
import owner from './owner'

Vue.use(Vuex)

export default new Vuex.Store({
  modules: {
    chain,
    owner,
    market,
    network,
  },
})
