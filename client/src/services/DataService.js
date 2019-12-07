import store from '@/store/store'
import _partition from 'lodash/partition'
import {
  cloneDeep,
  chain,
  includes,
  isEqual,
  has,
  isObject,
  uniqBy,
  filter,
  findLast,
  first,
  last
} from 'lodash'
const moment = require('moment')

const DEVICE_TYPE_FIELDS = ['uploader', 'pump', 'openaps', 'loop', 'xdripjs']
const TWO_DAYS = 172800000

let lastChecked = new Date()
let lastSuspendTime = new Date('1900-01-01')

export default {
  /**
   *
   * @param {*} time
   * @param {*} cutoff
   * @param {*} max
   * @param {*} treatmentsToo
   */
  splitRecent(time, cutoff, max, treatmentsToo) {
    let dataStore = store.state.data

    const recent = item => {
      return item.mills >= time - cutoff
    }

    const filterMax = item => {
      return item.mills >= time - max
    }

    const partition = (field, filter) => {
      let data
      let result = {
        first: {},
        rest: {}
      }

      if (filter) {
        data = dataStore[field].filter(filterMax)
      } else {
        data = dataStore[field]
      }

      const parts = _partition(data, recent)
      result.first[field] = parts[0]
      result.rest[field] = parts[1]

      return result
    }

    let result = partition('treatments', treatmentsToo ? filterMax : false)

    // get the recent device status
    result.first.devicestatus = this.recentDeviceStatus(time)

    result.first.sgvs = dataStore.sgvs.filter(filterMax)
    result.first.cals = dataStore.cals

    let profiles = cloneDeep(dataStore.profiles)

    if (profiles && profiles[0]) {
      Object.keys(profiles[0].store).forEach(k => {
        if (k.indexOf('@@@@@') > 0) {
          delete profiles[0].store[k]
        }
      })
    }

    result.first.profiles = profiles

    result.rest.mbgs = dataStore.mbgs.filter(filterMax)
    result.rest.food = dataStore.food
    result.rest.activity = dataStore.activity

    console.log(
      'results.first size',
      JSON.stringify(result.first).length,
      'bytes'
    )
    console.log(
      'results.rest size',
      JSON.stringify(result.rest).length,
      'bytes'
    )

    return result
  },
  /**
   *
   * @param {*} time
   */
  recentDeviceStatus(time) {
    let dataStore = store.state.data

    let deviceAndTypes = chain(dataStore.devicestatus)
      .map(status => {
        return chain(status)
          .keys()
          .filter(key => {
            return includes(DEVICE_TYPE_FIELDS, key)
          })
          .map(key => {
            return {
              device: status.device,
              type: key
            }
          })
          .value()
      })
      .flatten()
      .uniqWith(isEqual)
      .value()

    let rv = chain(deviceAndTypes)
      .map(deviceAndType => {
        return chain(dataStore.devicestatus)
          .filter(status => {
            return (
              status.device === deviceAndType.device &&
              has(status, deviceAndType.type)
            )
          })
          .filter(status => {
            return status.mills <= time
          })
          .sortBy('mills')
          .takeRight(10)
          .value()
      })
      .value()

    let merged = [].concat.apply([], rv)

    rv = chain(merged)
      .filter(isObject)
      .uniq('_id')
      .sortBy('mills')
      .value()

    return rv
  },
  /**
   *
   * @param {*} treatments
   * @param {*} keepzeroduration
   */
  processDurations(treatments, keepzeroduration) {
    treatments = uniqBy(treatments, 'mills')

    // cut temp basals by end events
    // better to do it only on data update
    let endEvents = treatments.filter(t => {
      return !t.duration
    })

    const cutIfInInterval = (base, end) => {
      if (
        base.mills < end.mills &&
        base.mills + moment.duration(base.duration, 'minutes').milliseconds() >
          end.mills
      ) {
        base.duration = moment.duration(end.mills - base.mills).minutes()

        if (end.profile) {
          base.cuttedby = end.profile
          end.cutting = base.profile
        }
      }
    }

    // cut by end events
    treatments.forEach(treatment => {
      if (treatment.duration) {
        endEvents.forEach(e => {
          cutIfInInterval(treatment, e)
        })
      }
    })

    // cut by overlaping events
    treatments.forEach(treatment => {
      if (treatment.duration) {
        treatments.forEach(e => {
          cutIfInInterval(treatment, e)
        })
      }
    })

    if (keepzeroduration) {
      return treatments
    } else {
      return treatments.filter(treatment => {
        return treatment.duration
      })
    }
  },
  /**
   *
   * @param {boolean} preserveOrignalTreatments
   */
  processTreatments(preserveOrignalTreatments) {
    let results = {}

    // filter & prepare 'Site Change' events
    results['sitechangeTreatments'] = store.state.data.treatments
      // filtering the sensor
      .filter(t => {
        return t.eventType.indexOf('Site Change') > -1
      })
      .sort((a, b) => {
        return a.mills > b.mills
      })

    // filter & prepare 'Insulin Change' events
    results['insulinchangeTreatments'] = store.state.data.treatments
      // filter insulin
      .filter(t => {
        return t.eventType.indexOf('Insulin Change') > -1
      })
      .sort((a, b) => {
        return a.mills > b.mills
      })

    // filter & prepare 'Pump Battery Change' events
    results['batteryTreatments'] = store.state.data.treatments
      // filter sensor
      .filter(t => {
        return t.eventType.indexOf('Pump Battery Change') > -1
      })
      .sort((a, b) => {
        return a.mills > b.mills
      })

    // filter & prepare 'Sensor' events
    results['sensorTreatments'] = store.state.data.treatments
      .filter(t => {
        return t.eventType.indexOf('Sensor') > -1
      })
      .sort((a, b) => {
        return a.mills > b.mills
      })

    // filter & prepare 'Profile Switch' events
    let profileTreatments = store.state.data.treatments
      .filter(t => {
        return t.eventType === 'Profile Switch'
      })
      .sort((a, b) => {
        return a.mills > b.mills
      })

    if (preserveOrignalTreatments) {
      profileTreatments = cloneDeep(profileTreatments)
    }
    results['profileTreatments'] = this.processDurations(
      profileTreatments,
      true
    )

    // filter & prepare 'Combo Bolus' events
    results['combobolusTreatments'] = store.state.data.treatments
      // filter Combo Boluses
      .filter(t => {
        return t.eventType === 'Combo Bolus'
      })
      .sort((a, b) => {
        return a.mills > b.mills
      })

    // filter & prepare temp basals
    let tempbasalTreatments = store.state.data.treatments.filter(t => {
      return t.eventType && t.eventType.indexOf('Temp Basal') > -1
    })

    if (preserveOrignalTreatments) {
      tempbasalTreatments = cloneDeep(tempbasalTreatments)
    }
    results['tempbasalTreatments'] = this.processDurations(
      tempbasalTreatments,
      false
    )

    // filter temp target
    let tempTargetTreatments = store.state.data.treatments.filter(t => {
      // check for a units being sent
      if (t.units) {
        if (t.units == 'mmol') {
          // convert to mgdl
          t.targetTop = t.targetTop * 18
          t.targetBottom = t.targetBottom * 18
          t.units = 'mg/dl'
        }
      }

      // if we have a temp target thats below 20, assume its mmol and convert to mgdl for safety
      if (t.targetTop < 20) {
        t.targetTop = t.targetTop * 18
        t.units = 'mg/dl'
      }
      if (t.targetBottom < 20) {
        t.targetBottom = t.targetBottom * 18
        t.units = 'mg/dl'
      }

      return t.eventType && t.eventType.indexOf('Temporary Target') > -1
    })

    if (preserveOrignalTreatments) {
      tempTargetTreatments = cloneDeep(tempTargetTreatments)
    }
    results['tempTargetTreatments'] = this.processDurations(
      tempTargetTreatments,
      false
    )

    return results
  },
  /**
   *
   * @param {*} isDelta
   * @param {*} cachedDataArray
   * @param {*} receivedDataArray
   * @param {*} maxAge
   */
  mergeDataUpdate(isDelta, cachedDataArray, receivedDataArray, maxAge) {
    const nsArrayDiff = (oldArray, newArray) => {
      let seen = []
      let l = oldArray.length

      for (let i = 0; i < l; i++) {
        if (oldArray[i] !== null) {
          seen.push(oldArray[i].mills)
        }
      }

      let result = []
      l = newArray.length

      for (let j = 0; j < l; j++) {
        if (!seen.includes(newArray[j].mills)) {
          result.push(newArray[j]) // console.log('delta data found')
        }
      }

      return result
    }

    // If there was no delta data, just return the original data
    if (!receivedDataArray) {
      return cachedDataArray || []
    }

    // If this is not a delta update, replace all data
    if (!isDelta) {
      return receivedDataArray || []
    }

    // purge old data from cache before updating
    let mAge = isNaN(maxAge) || maxAge == null ? TWO_DAYS : maxAge
    let twoDaysAgo = new Date().getTime() - mAge

    for (let i = 0; i < cachedDataArray.length; i++) {
      let element = cachedDataArray[i]
      if (
        element !== null &&
        element !== undefined &&
        element.mills <= twoDaysAgo
      ) {
        cachedDataArray.splice(i, 0)
      }
    }

    // if this is delta, calculate the difference, merge and sort
    let diff = nsArrayDiff(cachedDataArray, receivedDataArray)
    return cachedDataArray.concat(diff).sort((a, b) => {
      return a.mills - b.mills
    })
  },
  /**
   *
   * @param {*} isDelta
   * @param {*} cachedDataArray
   * @param {*} receivedDataArray
   */
  mergeTreatmentUpdate(isDelta, cachedDataArray, receivedDataArray) {
    // if there was no delta data, just return the original data
    if (!receivedDataArray) {
      return cachedDataArray || []
    }

    // if this is not a delta update, replace all data
    if (!isDelta) {
      return receivedDataArray || []
    }

    // check for update, change, remove
    let l = receivedDataArray.length
    let m = cachedDataArray.length

    for (let i = 0; i < l; i++) {
      let no = receivedDataArray[i]
      if (!no.action) {
        cachedDataArray.push(no)
        continue
      }

      for (let j = 0; j < m; j++) {
        if (no._id === cachedDataArray[j]._id) {
          if (no.action === 'remove') {
            cachedDataArray.splice(j, 1)
            break
          }
          if (no.action === 'update') {
            delete no.action
            cachedDataArray.splice(j, 1, no)
            break
          }
        }
      }
    }

    // if this is delta, calculate the difference, merge and sort
    return cachedDataArray.sort((a, b) => {
      return a.mills - b.mills
    })
  },
  /**
   * Process the data into entries or points
   */
  prepareEntries() {
    // post processing after data is in
    const dataStore = store.state.data
    let temp1 = []
    let entries = []

    if (dataStore.cal && store.getters.isFeatureEnabled('rawbg')) {
      temp1 = store.state.data.sgvs.map(_entry => {
        // TODO
        // var rawbgValue = client.rawbg.showRawBGs(entry.mgdl, entry.noise, client.ddata.cal, sbx) ? client.rawbg.calc(entry, client.ddata.cal, sbx) : 0;
      })
    }

    let temp2 = dataStore.sgvs.map(obj => {
      return {
        mills: obj.mills,
        mgdl: obj.mgdl,
        direction: obj.direction,
        color: this.sgvToColor(obj.mgdl),
        type: 'sgv',
        noise: obj.noise,
        filtered: obj.filtered,
        unfiltered: obj.unfiltered
      }
    })

    entries = entries.concat(temp1, temp2)

    entries = entries.concat(
      store.state.data.mbgs.map(obj => {
        return {
          mills: obj.mills,
          mgdl: obj.mgdl,
          color: 'red',
          type: 'mbg',
          device: obj.device
        }
      })
    )

    // time in miliseconds of 48 hours back
    let tooOld =
      store.state.currentTime - moment.duration(48, 'hours').asMilliseconds()

    // filtering to entries of no more than 48 hours
    entries = filter(entries, entry => {
      return entry.mills > tooOld
    })

    entries.forEach(point => {
      if (point.mgdl < 39) {
        point.color = 'transparent'
      }
    })

    return entries
  },
  sgvToColor(sgv) {
    let color = 'grey'
    const settings = store.state.serverSettings.settings

    if (settings.theme !== 'default') {
      if (sgv > settings.thresholds.bgHigh) {
        color = 'red'
      } else if (sgv > settings.thresholds.bgTargetTop) {
        color = 'yellow'
      } else if (
        sgv >= settings.thresholds.bgTargetBottom &&
        sgv <= settings.thresholds.bgTargetTop &&
        settings.theme === 'colors'
      ) {
        color = '#4cff00'
      } else if (sgv < settings.thresholds.bgLow) {
        color = 'red'
      } else if (sgv < settings.thresholds.bgTargetBottom) {
        color = 'yellow'
      }
    }

    return color
  },
  /**
   *
   * @param {*} entry
   */
  entryMills(entry) {
    return entry && entry.mills
  },
  /**
   *
   * @param {*} entries
   */
  lastEntry(entries) {
    return findLast(entries, entry => {
      return this.entryMills(entry) <= store.state.initTime
    })
  },
  /**
   *
   * @param {*} entry
   */
  isCurrent(entry) {
    return (
      entry &&
      store.state.initTime - entry.mills <=
        moment.duration(15, 'minutes').asMilliseconds()
    )
  },
  /**
   *
   * @param {*} insulin
   */
  roundInsulinForDisplayFormat(insulin) {
    if (insulin === 0) {
      return '0'
    }

    let dataStore = store.state.data
    if (dataStore.roundingStyle == 'medtronic') {
      let denominator = 0.1
      let digits = 1
      if (insulin <= 0.5) {
        denominator = 0.05
        digits = 2
      }

      return (Math.floor(insulin / denominator) * denominator).toFixed(digits)
    }

    return (Math.floor(insulin / 0.01) * 0.01).toFixed(2)
  },
  /**
   *
   * @param {*} bg
   */
  roundBGToDisplayFormat(bg) {
    const settings = store.state.serverSettings.settings
    return settings.units === 'mmol' ? Math.round(bg * 10) / 10 : Math.round(bg)
  },
  /**
   *
   * @param {*} mgdl
   */
  scaleMgdl(mgdl) {
    const settings = store.state.serverSettings.settings
    if (settings.units === 'mmol' && mgdl) {
      return Number(this.mgdlToMMOL(mgdl))
    } else {
      return Number(mgdl)
    }
  },
  /**
   *
   */
  unitsLabel() {
    const settings = store.state.serverSettings.settings
    return settings && settings.units === 'mmol' ? 'mmol/L' : 'mg/dl'
  },
  /**
   *
   * @param {*} mgdl
   */
  mgdlToMMOL(mgdl) {
    return (Math.round((mgdl / 18) * 10) / 10).toFixed(1)
  },
  /**
   *
   * @param {*} mgdl
   */
  mmolToMgdl(mgdl) {
    return Math.round(mgdl * 18)
  },
  /**
   *
   */
  findOfflineMarker() {
    let dataStore = store.state.data

    return findLast(dataStore.treatments, treatment => {
      let eventTime = this.entryMills(treatment)
      let eventEnd = treatment.duration
        ? eventTime +
          moment.duration(treatment.duration, 'minutes').asMilliseconds()
        : eventTime
      const initTime = store.state.initTime

      return (
        eventTime <= initTime &&
        treatment.eventType === 'OpenAPS Offline' &&
        eventEnd >= initTime
      )
    })
  },
  /**
   *
   */
  checkCurrentStatus() {
    // check if the app has been suspended, if yes, snooze data missing alarm for 15 seconds
    let now = new Date()
    let delta = now.getTime() - lastChecked.getTime()
    lastChecked = now
    const initTime = store.state.initTime

    if (delta > 15 * 1000) {
      // looks like we've been hibernating
      lastSuspendTime = now
    }

    let timeSinceLastSuspended = now.getTime() - lastSuspendTime.getTime()

    if (timeSinceLastSuspended < 10 * 1000) {
      console.log('Hibernation detected, suspending timeago alarm')
      return 'current'
    }

    let lastSGVEntry = store.getters['data/lastSGVEntry']
    let warn = store.state.serverSettings.settings.alarmTimeagoWarn
    let warnMins =
      store.state.serverSettings.settings.alarmTimeagoWarnMins || 15
    let urgent = store.state.serverSettings.settings.alarmTimeagoUrgent
    let urgentMins =
      store.state.serverSettings.settings.alarmTimeagoUrgentMins || 30

    const isStale = mins => {
      return (
        initTime - lastSGVEntry.mills >
        moment.duration(Number(mins), 'minutes').asMilliseconds()
      )
    }

    if (!lastSGVEntry) {
      return 'current'
    } else if (urgent && isStale(urgentMins)) {
      return 'urgent'
    } else if (warn && isStale(warnMins)) {
      return 'warn'
    }
  },
  /**
   *
   * @param {*} device
   */
  getDeviceName(device) {
    let lastChunk = device ? last(device.split('://')) : 'unknown'
    return first(lastChunk.split('/'))
  },
  /**
   *
   * @param {*} entry
   */
  scaleEntry(entry) {
    const settings = store.state.serverSettings.settings

    if (entry && entry.scaled === undefined) {
      if (settings.units === 'mmol') {
        entry.scaled = entry.mmol || this.mgdlToMMOL(entry.mgdl)
      } else {
        entry.scaled = entry.mgdl || this.mmolToMgdl(entry.mmol)
      }
    }

    return entry && Number(entry.scaled)
  },
  /**
   *
   * @param {*} value
   */
  toFixed(value) {
    if (!value) {
      return '0'
    } else {
      var fixed = value.toFixed(2)
      return fixed === '-0.00' ? '0.00' : fixed
    }
  }
}
