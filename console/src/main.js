import Vue from 'vue'
import App from './App.vue'
import router from './router'
import { app } from './services'
import { i18n } from './i18n'
import store from './store'
import './services/ui'

Vue.config.productionTip = false
Vue.config.devtools = app.dev
Vue.config.performance = !app.dev

new Vue({
  router,
  store,
  i18n,
  render: h => h(App),
}).$mount('#app')
