import Vue from 'vue'
import Router from 'vue-router'
import store from './store'

import Home from './views/Home'
import Login from './views/Login'
import Owner from './views/Owner'
import Chain from './views/Chain'
import Node from './views/Node'
import Network from './views/Network'
import Market from './views/Market'

Vue.use(Router)

const router = new Router({
  routes: [
    {
      path: '/',
      component: Home,
      children: [
        {
          path: 'login',
          component: Login,
        },
        {
          path: 'owner',
          component: Owner,
        },
        {
          path: 'chain',
          component: Chain,
        },
        {
          path: 'node',
          component: Node,
        },
        {
          path: 'network',
          component: Network,
        },
        {
          path: 'market',
          component: Market,
        },
        {
          path: '*',
          redirect: 'owner',
        },
      ],
    },
  ],
})

router.beforeEach((to, _, next) => {
  const loginPage = to.path === '/login'
  const signed = store.getters.isLogin
  if (!loginPage && !signed) {
    next('/login')
    return
  }
  if (loginPage && signed) {
    next('/owner')
    return
  }
  next()
})

export default router
