// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'
import router from './router'
import axios from 'axios'
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';

Vue.config.productionTip = false

/* eslint-disable no-new */

global.wo={}
window.tic = {}

wo.Tool=new (require('../../server/Base/Egg.js'))()

wo.Crypto=require('../../server/Base/Crypto.js')
wo.Ling=require('../../server/Ling/_Ling.js')
tic.Account = require('../../server/Ling/Account.js')
tic.Action = require('../../server/Ling/Action.js')
tic.ActTransfer = require('../../server/Ling/ActTransfer.js')
//tic.ActStorage = require('../../server/Ling/ActStorage')
// tic.ActToken = require('../../server/Ling/ActToken')

Vue.use(ElementUI);
Vue.prototype.$ajax = axios;

new Vue({
  el: '#app',
  router,
  components: { App },
  template: '<App/>'
})
