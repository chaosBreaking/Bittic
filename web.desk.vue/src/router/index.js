import Vue from 'vue'
import Router from 'vue-router'
import login from '../pages/Login'
import admin from '@/pages/Admin'
import owner from '@/components/owner'
import chain from '@/components/chain'
import node from '@/components/node'
import web from '@/components/web'
import notification from '@/components/notification'
import transfer from '@/components/transfer'
import 'element-ui/lib/theme-chalk/index.css'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'login',
      component: login
    },

    {
      path: '/admin',
      name: 'admin',
      component: admin,
      children:[
        { path: '/owner', component: owner },
        { path: '/chain', component: chain },
        { path: '/node', component: node },
        { path: '/web', component: web },
        { path: '/notification', component: notification },
        { path: '/transfer', component: transfer }
      ]
    }
  
  ]

})
