import Vue from 'vue'
import { Vuetify } from 'vuetify'
import {
  VApp,
  VBtn,
  VMenu,
  VIcon,
  VDialog,
  VSelect,
  VTextField,
  VPagination,
} from 'vuetify/es5/components'
import { VSpacer } from 'vuetify/es5/components/VGrid'
import { VDataTable } from 'vuetify/es5/components/VDataTable'
import { VCard, VCardTitle, VCardActions } from 'vuetify/es5/components/VCard'
import { Ripple } from 'vuetify/es5/directives'
import 'vuetify/dist/vuetify.min.css'
import 'material-design-icons-iconfont/dist/material-design-icons.css'

Vue.use(Vuetify, {
  theme: {
    primary: '#4666b9',
    secondary: '#dfa24e',
    accent: '#FFCDD2',
  },
})

Vue.component('VApp', VApp)
Vue.component('VBtn', VBtn)
Vue.component('VCard', VCard)
Vue.component('VMenu', VMenu)
Vue.component('VIcon', VIcon)
Vue.component('VDialog', VDialog)
Vue.component('VSpacer', VSpacer)
Vue.component('VSelect', VSelect)
Vue.component('VTextField', VTextField)
Vue.component('VDataTable', VDataTable)
Vue.component('VPagination', VPagination)
Vue.component('VCardTitle', VCardTitle)
Vue.component('VCardActions', VCardActions)

Vue.directive('Ripple', Ripple)
