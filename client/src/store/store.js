import Vue from 'vue'
import Vuex from 'vuex'
import VuexPersistence from 'vuex-persist'
import find from 'lodash/find'
import DashboardService from '@/services/DashboardService'
import { publishNotification } from '@/utils/storeHelpers.js'

// importing modules of store
import * as notification from '@/store/modules/notification.js'
import * as data from '@/store/modules/data.js'
import * as settings from '@/store/modules/settings.js'

Vue.use(Vuex)

/**
 * persist to local storage the settings
 */
const vuexLocal = new VuexPersistence({
  storage: window.localStorage,
  modules: ['settings'],
  key: 'NS_settings'
})

export default new Vuex.Store({
  modules: {
    data,
    notification,
    settings
  },
  state: {
    drawer: {
      open: false,
      clipped: true,
      right: true
    },
    currentTime: 0,
    initTime: Date.now(),
    serverSettings: {},
    auth: {
      apiSecret: false,
      apiSecretHash: localStorage.getItem('apisecrethash') || null,
      authenticated: false
    }
  },
  mutations: {
    TOGGLE_DRAWER(state, isOpen) {
      state.drawer.open = isOpen
    },
    UPDATE_CURRENT_TIME(state) {
      state.currentTime = Date.now()
    },
    /**
     * Store the Settings obtained from server
     * @param {*} state
     * @param {*} settings settings obtained from backend
     */
    SET_SERVER_SETTINGS(state, settings) {
      // setting the state with server settings
      state.serverSettings = settings //{ ...state, serverSettings: settings }
    },
    /**
     * Set to true `authenticated`
     * @param {*} state
     */
    AUTHENTICATION_PASSED(state) {
      state.auth.authenticated = true
      // TODO: still don't know when apiSecretHash and api Secret
      // are settled by the app
    },
    /**
     * Reset the values of Auth and clear local storage apiSecretHash
     * @param {*} state
     */
    DEAUTHENTICATE(state) {
      state.auth = {
        authenticated: false,
        apiSecret: null,
        apiSecretHash: null
      }
      // also cleaning local storage
      localStorage.removeItem('apisecrethash')
    }
  },
  actions: {
    /**
     * Toggles the open state of the drawer
     */
    toggleDrawer({ commit, state }) {
      commit('TOGGLE_DRAWER', !state.drawer.open)
    },
    /**
     * updates the current time, that is also displayed on the clock
     */
    updateCurrentTime({ commit }) {
      commit('UPDATE_CURRENT_TIME')
    },
    /**
     * Calls the DashboardService to get the Application Settings from backend service
     */
    async getServerSettings({ commit, dispatch }) {
      try {
        let settings = await DashboardService.getAppSettings()

        commit('SET_SERVER_SETTINGS', settings)
      } catch (err) {
        // display notification to user
        publishNotification(
          'error',
          'Connecting to Nightscout server failed, retrying every 2 seconds.' +
            err.message,
          dispatch
        )
        throw err
      }
    },
    /**
     * Verify if the user is authenticated or not
     */
    async verifyAuthentication({ commit }) {
      try {
        let isAuth = await DashboardService.verifyAuth()

        if (isAuth) {
          commit('AUTHENTICATION_PASSED')
        } else {
          commit('DEAUTHENTICATE')
        }
      } catch (err) {
        console.log('ERROR:', err)
      }
    }
  },
  getters: {
    apiSecretHash: state => {
      return state.auth.apiSecretHash
    },
    isAuthenticated: state => {
      return state.auth.authenticated
    },
    authorized: state => {
      return state.serverSettings.authorized
    },
    isFeatureEnabled: state => feature => {
      let enabled = false
      const settings = state.serverSettings.settings

      if (settings) {
        if (
          settings.enable &&
          typeof feature === 'object' &&
          feature.length !== undefined
        ) {
          enabled =
            find(feature, f => {
              return settings.enable.indexOf(f) > -1
            }) !== undefined
        } else {
          enabled = settings.enable && settings.enable.indexOf(feature) > -1
        }
      }

      return enabled
    }
  },
  plugins: [vuexLocal.plugin]
})
