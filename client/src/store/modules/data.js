import DataService from '@/services/DataService.js'
import ProfileService from '@/services/ProfileService.js'
import last from 'lodash/last'

export const namespaced = true

export const state = {
  sgvs: [],
  treatments: [],
  mbgs: [],
  cal: 0,
  cals: [],
  profiles: [],
  devicestatus: [],
  food: [],
  activity: [],
  entries: [],
  lastUpdated: 0,
  inRetroMode: false,
  profile: {},
  iob: {},
  openApsForecastPoints: [],
  sitechangeTreatments: [],
  insulinchangeTreatments: [],
  batteryTreatments: [],
  sensorTreatments: [],
  profileTreatments: [],
  combobolusTreatments: [],
  tempbasalTreatments: [],
  tempTargetTreatments: []
}

export const mutations = {
  UPDATE_DATA_ARRAYS(state, update) {
    state.sgvs = update.sgvs
    state.mbgs = update.mbgs
    state.treatments = update.treatments
    state.food = update.food
    state.lastUpdated = Date.now()
    state.inRetroMode = false
  },
  UPDATE_CALS(state, data) {
    state.cals = data.cals
    state.cal = last(data.cals)
  },
  UPDATE_DEVICE_STATUS(state, newDevStatus) {
    state.devicestatus = newDevStatus
  },
  UPDATE_PROCESSED_TREATMENTS(state, newProcTreats) {
    state.sitechangeTreatments = newProcTreats.sitechangeTreatments
    state.insulinchangeTreatments = newProcTreats.insulinchangeTreatments
    state.batteryTreatments = newProcTreats.batteryTreatments
    state.sensorTreatments = newProcTreats.sensorTreatments
    state.profileTreatments = newProcTreats.profileTreatments
    state.combobolusTreatments = newProcTreats.combobolusTreatments
    state.tempbasalTreatments = newProcTreats.tempbasalTreatments
    state.tempTargetTreatments = newProcTreats.tempTargetTreatments
  },
  UPDATE_PROFILE_TREATMENTS(state, update) {
    state.profile.profiletreatments = update.profiletreatments
    state.profile.tempbasaltreatments = update.tempbasaltreatments
    state.profile.combobolustreatments = update.combobolustreatments
    state.profile.profiletreatments_hash = update.profiletreatments_hash
    state.profile.tempbasaltreatments_hash = update.tempbasaltreatments_hash
    state.profile.combobolustreatments_hash = update.combobolustreatments_hash
  },
  UPDATE_PROFILES_DATA(state, data) {
    state.profile.data = data
  },
  UPDATE_ENTRIES(state, entries) {
    state.entries = entries
  },
  UPDATE_IOB(state, newIob) {
    state.iob = { ...state.iob, ...newIob }
  },
  UPDATE_OPENAPS_FORECAST_POINTS(state, newForecastPoints) {
    state.openApsForecastPoints = newForecastPoints
  }
}

export const actions = {
  updateData({ commit, state, rootState }, data) {
    if (!data) {
      return
    }
    const settings = rootState.serverSettings

    // calculate the diff to existing data and replace as needed
    commit('UPDATE_DATA_ARRAYS', {
      sgvs: DataService.mergeDataUpdate(data.delta, state.sgvs, data.sgvs),
      mbgs: DataService.mergeDataUpdate(data.delta, state.mbgs, data.mbgs),
      treatments: DataService.mergeTreatmentUpdate(
        data.delta,
        state.treatments,
        data.treatments
      ),
      food: DataService.mergeTreatmentUpdate(data.delta, state.food, data.food)
    })

    // Proces Treatments
    commit('UPDATE_PROCESSED_TREATMENTS', DataService.processTreatments(false))

    // updating cals
    if (data.cals) {
      commit('UPDATE_CALS', data)
    }

    // updating the device status
    if (data.devicestatus) {
      if (
        settings &&
        settings.extendedSettings &&
        settings.extendedSettings.devicestatus &&
        settings.extendedSettings.devicestatus.advanced
      ) {
        // only use extra memory in advanced mode
        commit(
          'UPDATE_DEVICE_STATUS',
          DataService.mergeDataUpdate(
            data.delta,
            status.devicestatus || [],
            data.devicestatus
          )
        )
      } else {
        commit('UPDATE_DEVICE_STATUS', data.devicestatus)
      }
    }

    // Resend new treatments to profile
    commit(
      'UPDATE_PROFILE_TREATMENTS',
      ProfileService.updateTreatments(
        state.profileTreatments,
        state.tempbasalTreatments,
        state.combobolusTreatments
      )
    )

    // load profiles data
    if (data.profiles) {
      commit('UPDATE_PROFILES_DATA', ProfileService.loadData(data.profiles))
    }

    // TODO: some update related with client.ctx and client.latestSGV
    // if (client.ddata.sgvs)

    // updating entries by generate them
    commit('UPDATE_ENTRIES', DataService.prepareEntries())
  },
  updateIob({ commit }, newIob) {
    if (!newIob) return false

    commit('UPDATE_IOB', newIob)
  },
  updateOpenAPSForecastPoints({ commit }, newForecastPoints) {
    commit('UPDATE_OPENAPS_FORECAST_POINTS', newForecastPoints)
  }
}

export const getters = {
  lastSGVEntry: state => {
    return DataService.lastEntry(state.sgvs)
  },
  lastSGVMgdl: (state, getters) => {
    const last = getters.lastSGVEntry
    return last && last.mgdl
  },
  lastSGVMills: (state, getters) => {
    return DataService.entryMills(getters.lastSGVEntry)
  },
  lastScaledSGV: (state, getters) => {
    return DataService.scaleEntry(getters.lastSGVEntry)
  }
}
