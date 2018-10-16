import { ticApi } from '../../services'
import router from '../../router'
import { i18n } from '../../i18n'
import _ from 'lodash'

export default {
  namespaced: true,

  state: {
    mnemonic: '',
    errorMnemonic: '',
    signing: false,
  },

  getters: {
    inputError: state => !!state.errorMnemonic,
  },

  mutations: {
    updateMnemonic(state, mnemonic) {
      if (state.errorMnemonic) {
        state.errorMnemonic = ''
      }
      state.mnemonic = mnemonic
    },

    updateError(state, error) {
      state.errorMnemonic = error
    },

    updateSign(state, signing) {
      state.signing = signing
    },
  },

  actions: {
    async login({ state, commit }) {
      commit('updateSign', true)
      const account = (await ticApi.secword2Account(state.mnemonic)) || {}
      console.log(account)
      commit('updateSign', false)
      if (await ticApi.isAddress(account.address)) {
        commit('updateAccount', _.omit(account, 'seckey'), { root: true })
        router.push('/owner')
      } else {
        commit('updateError', i18n.t('login.errorMnemonic'))
      }
    },
  },
}
