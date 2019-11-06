import Vue from 'vue'
import App from '@/App.vue'
import router from '@/router'
import store from '@/store/store'
import './registerServiceWorker'
import upperFirst from 'lodash/upperFirst'
import camelCase from 'lodash/camelCase'
import vuetify from '@/plugins/vuetify'
import SocketService from '@/plugins/SocketService'
import { apiClient } from '@/utils/http-common'

/**
 * Automatic global register of components
 */
const requireComponent = require.context(
  './components',
  false,
  /Base[A-Z]\w+\.(vue|js)$/
)

requireComponent.keys().forEach(fileName => {
  const componentConfig = requireComponent(fileName)

  const componentName = upperFirst(
    camelCase(fileName.replace(/^\.\/(.*)\.\w+$/, '$1'))
  )

  Vue.component(componentName, componentConfig.default || componentConfig)
})
/** ----- */

/**
 * Setting up Axios
 */
Vue.prototype.$http = apiClient
/** ------ */

Vue.use(SocketService)

Vue.config.productionTip = false

new Vue({
  router,
  store,
  vuetify,
  SocketService,
  render: h => h(App)
}).$mount('#app')
