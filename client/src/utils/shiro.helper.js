const shiroTrie = require('shiro-trie')
import find from 'lodash/find'
import isObject from 'lodash/isObject'
import store from '@/store/store'

export default {
  /**
   * Returns an array of Shiro permissions obtained from Permission Groups of the user
   * @returns {array}
   */
  getUserShiros() {
    // if authorized settings from server
    if (store.getters.authorized) {
      return store.getters.authorized.permissionGroups.map(group => {
        // new instance of Shiro
        let shiro = shiroTrie.new()
        group.forEach(permission => {
          shiro.add(permission)
        })

        return shiro
      })
    }

    return []
  },
  /**
   * Checks if the user has a given permission
   * @param {string} permission a given permisson to check
   * @returns {boolean}
   */
  checkPermission(permission) {
    let found = find(this.getUserShiros(), shiro => {
      return shiro.check(permission)
    })

    return isObject(found)
  }
}
