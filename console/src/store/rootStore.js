import { storage } from '../services'
import { loadLanguageAsync } from '../i18n'
import router from '../router'

const KEY_ACCOUNT = 'KEY_ACCOUNT'

function retrieveAccount() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY_ACCOUNT))
  } catch (e) {
    return {}
  }
}

function storeAccount(account) {
  sessionStorage.setItem(KEY_ACCOUNT, JSON.stringify(account))
}

function clearAccount() {
  sessionStorage.removeItem(KEY_ACCOUNT)
}

const sideMenus = [
  {
    title: 'home.titleOwner',
    icon: 'group',
    path: '/owner',
  },
  {
    title: 'home.titleNode',
    icon: 'all_inclusive',
    path: '/node',
  },
  {
    title: 'home.titleNetwork',
    icon: 'public',
    path: '/network',
  },
  {
    title: 'home.titleChain',
    icon: 'timeline',
    path: '/chain',
  },
  {
    title: 'home.titleMarket',
    icon: 'apps',
    path: '/market',
  },
]

export default {
  state: {
    account: retrieveAccount() || {},
    supportLangs: storage.supportLangs,
    currentLang: storage.currentLanguage,
    sideMenus,
    sideCollapsed: false,
  },

  getters: {
    isLogin: state => state.account.pubkey,

    currentPath: () => router.currentRoute.path,
  },

  mutations: {
    updateCurrentLang(state, lang) {
      state.currentLang = lang
    },

    updateAccount(state, account) {
      state.account = account || {}
      storeAccount(state.account)
    },

    updateRoute(_, destination) {
      router.push(destination)
    },

    toggleCollapse(state) {
      state.sideCollapsed = !state.sideCollapsed
    },

    logout(state) {
      state.account = {}
      clearAccount()
      router.push('/login')
    },
  },

  actions: {
    async updateCurrentLang({ commit }, lang) {
      commit('updateCurrentLang', await loadLanguageAsync(lang))
    },
  },
}
