import Vue from 'vue'
import App from './App.vue'
import Router from 'vue-router'
import $ from 'jquery'
import axios from 'axios'
import VueAxios from 'vue-axios'
import ElementUI from 'element-ui'
import Base from '@/components/Base'
import index from '@/components/index'
import Login from '@/components/Login'
import token from '@/components/token'
import blocks from '@/components/blocks'
import account from '@/components/account'
import exchange from '@/components/exchange'
import 'element-ui/lib/theme-chalk/index.css'

window.tic = {}
tic.Const=require('../../../ticnode/Base/Const.js')
tic.Crypto=require('../../../ticnode/Base/Crypto.js') // from frontend, it requires crypto from backend. normally frontend cann't use nodejs files because frontend doesn't know "require" command at all. Therefore we need webpack or browserify ,which parses an input file, reads all required files and package into one big file that can be used by frontend browser
tic.Tool=require('../../../ticnode/Base/Tool4Web.js')
tic.Action=require('../../../ticnode/Ling/Action.js')
tic.ActTransfer=require('../../../ticnode/Ling/ActTransfer.js')

Vue.use(ElementUI)
Vue.use(Router)
Vue.prototype.$ajax = axios
new Vue({
  router: new Router({
    routes: [
        {path: '/index',component: index},
        {path: '/myinfo',component: account},
        {path: '/exchange',component: exchange},
        {path: '/blocksinfo',component: blocks},
        {path: '/token',component: token},
        {path: '/base',component: Base},
        {path: '/login',component: Login}
    ]
}),
  el: '#app',
  render: h => h(App)
})
