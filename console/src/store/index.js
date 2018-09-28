import Vue from 'vue'
import Vuex from 'vuex'
import chain from './chain'
import market from './market'
import network from './network'
import owner from './owner'

Vue.use(Vuex)

export default new Vuex.Store({
  chain,
  owner,
  market,
  network,
})
