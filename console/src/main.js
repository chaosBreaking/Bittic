import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import { app } from './services'

Vue.config.productionTip = false
Vue.config.devtools = app.dev
Vue.config.performance = !app.dev

new Vue({
  router,
  store,
  render: h => h(App),
}).$mount('#app')
