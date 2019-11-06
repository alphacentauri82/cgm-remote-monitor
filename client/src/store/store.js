import Vue from 'vue'
import Vuex from 'vuex'
import VuexPersist from 'vuex-persist'
import find from 'lodash/find'
import DashboardService from '@/services/DashboardService'
import { publishNotification } from '@/utils/storeHelpers.js'
import { defaultSettings } from '@/utils/settingHelper.js'
import { apiClient } from '@/utils/http-common'

// importing modules of store
import * as notification from '@/store/modules/notification.js'
import * as data from '@/store/modules/data.js'

Vue.use(Vuex)

export default new Vuex.Store({
  modules: {
    data,
    notification
  },
  state: {
    currentTime: 0,
    initTime: Date.now(),
    serverSettings: {},
    //settings here is the default structure, If there are no data in mongodb,
    //localStore will use this structure to simulate setting data
    settings: {},
    auth: {
      apiSecret: false,
      apiSecretHash: localStorage.getItem('apisecrethash') || null,
      authenticated: false
    }
  },
  mutations: {
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
    UPDATE_SETTINGS(state, settings) {
      // Settings modified values comes from Setting Modal. The settings are created or updated in mongodb
      //If saving in mongo fails changes are saved into in localStorage by default
      state.settings = settings
      apiClient
        .post('v3/settings', settings)
        .then(response => {
          state.settings = response.data
        })
        .catch(error => {
          console.log('Error when trying to save settings: ' + error)
        })
    },
    RETRIEVE_SETTINGS(state) {
      if (
        !(state.settings.alarms !== null && state.settings.alarms !== undefined)
      ) {
        apiClient
          .get('v3/settings')
          .then(response => {
            if (response !== null && response !== undefined)
              state.settings = response.data
            else state.settings = defaultSettings
          })
          .catch(error => {
            console.log('Error when trying to retrieve settings: ' + error)
            state.settings = defaultSettings
          })
      }
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

      return enabled
    }
  },
  plugins: [new VuexPersist().plugin]
})
