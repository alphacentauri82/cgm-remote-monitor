import { apiClient } from '@/utils/http-common'
import store from '@/store/store'

export default {
  getAppSettings() {
    let src = `v1/status.json?t=${new Date().getTime()}`
    const secret = store.getters.apiSecretHash

    // TODO: original code makes reference at the use of token or secret
    if (secret) {
      src += '&secret=' + secret
    }

    // get server status and app settings
    return apiClient
      .get(src)
      .then(response => {
        return response.data
      })
      .catch(err => {
        throw err
      })
  },
  /**
   * Verify if the user is authenticated or not
   * @returns boolean
   */
  verifyAuth() {
    const src = `v1/verifyauth?t=${Date.now()}`

    // get the headers, check /lib/client/index.js at line 24
    if (store.getters.authorized && store.getters.authorized.token) {
      apiClient.defaults.headers.common[
        'Authorization'
      ] = `Bearer ${store.getters.authorized.token}`
    } else if (store.getters.apiSecretHash) {
      apiClient.defaults.headers.common['api-secret'] =
        store.getters.apiSecretHash
    }

    return apiClient.get(src).then(response => {
      if (response.data.message === 'OK') {
        console.log('Authentication passed.')
        return true
      }

      console.log('Authentication failed.', response)
      return false
    })
  }
}
