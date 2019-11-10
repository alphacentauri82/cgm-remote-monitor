import { apiClient } from '@/utils/http-common'
import { publishNotification } from '@/utils/storeHelpers.js'

export const namespaced = true

export const state = {
  units: 'mg/dL',
  timeFormat: 12,
  language: 'en',
  scale: 'log',
  render: 'default',
  alarms: {
    uha: { scale: '', value: '240', checked: true },
    ha: { scale: '', value: '180', checked: true },
    la: { scale: '', value: '80', checked: true },
    ula: { scale: '', value: '65', checked: true },
    sdw: { scale: 'mins', value: '15', checked: true },
    sdu: { scale: '', value: '30', checked: true },
    pbla: { scale: '', value: '', checked: false }
  },
  nightMode: false,
  editMode: true,
  showRawbg: 'never',
  customTitle: 'Nightscout',
  theme: 'default',
  alarmUrgentHigh: true,
  history: 48,
  plugins: {
    insulin: false,
    carbs: false,
    'care-port': false,
    pump: false,
    openaps: false,
    cannula: false,
    'sensor-age': false,
    'insulin-age': false,
    'basal-profile': false,
    'pump-battery-change': false,
    'bolus-wizard': false,
    speech: false
  },
  openaps: false
}

export const mutations = {
  SET_SETTINGS(state, newSettings) {
    Object.assign(state, newSettings)
  }
}

export const actions = {
  retrieveSettings({ commit, dispatch }) {
    apiClient
      .get('v3/settings')
      .then(response => {
        if (response && response.status === 200) {
          commit('SET_SETTINGS', response.data)
        }
      })
      .catch(error => {
        console.log('Error when trying to retrieve settings: ' + error)
        // display notification to user
        publishNotification(
          'error',
          'Error getting the user settings.' + error.message,
          dispatch
        )
      })
  },
  updateSettings({ commit, dispatch }, settings) {
    return apiClient
      .post('v3/settings', settings)
      .then(response => {
        if (response.status === 200) {
          if (response.data.error) {
            publishNotification(
              'error',
              'Settings not saved.' + response.data.error,
              dispatch
            )
          } else {
            commit('SET_SETTINGS', response.data)
            // display notification to user
            publishNotification(
              'success',
              'The Settings has been updated.',
              dispatch
            )
          }
        }
      })
      .catch(err => {
        console.log('ERROR: ', err)
        // display notification to user
        publishNotification(
          'error',
          'Settings not saved.' + err.message,
          dispatch
        )
      })
  }
}
