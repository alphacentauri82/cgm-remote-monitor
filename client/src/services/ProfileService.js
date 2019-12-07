import store from '@/store/store'
import uniqBy from 'lodash/uniqBy'
import each from 'lodash/each'
import moment from 'moment'
import 'moment-timezone'
const crypto = require('crypto')

// const cacheTTL = 600

/**
 * preprocess the timestamps to seconds for a couple orders of magnitude faster operation
 * @param {*} container
 */
const preprocessProfileOnLoad = container => {
  each(container, function(value) {
    if (Object.prototype.toString.call(value) === '[object Array]') {
      preprocessProfileOnLoad(value)
    }

    if (value.time) {
      let sec = timeStringToSeconds(value.time)
      if (!isNaN(sec)) {
        value.timeAsSeconds = sec
      }
    }
  })
}

/**
 *
 * @param {string} time
 */
const timeStringToSeconds = time => {
  let splitted = time.split(':')
  return parseInt(splitted[0] * 3600 + parseInt(splitted[1])) * 60
}

export default {
  /**
   *
   * @param {*} profileTreatments
   * @param {*} tempBasalTreatments
   * @param {*} comboBolusTreatments
   */
  updateTreatments(
    profileTreatments,
    tempBasalTreatments,
    comboBolusTreatments
  ) {
    let profTreatments = profileTreatments || []
    let tmpBsalTreatments = tempBasalTreatments || []
    let comboBTreatments = comboBolusTreatments || []

    // dedupe temp basal events
    tmpBsalTreatments = uniqBy(tmpBsalTreatments, 'mills')

    tmpBsalTreatments.forEach(t => {
      // add duration
      t.endmills =
        t.mills + moment.duration(t.duration || 0, 'minutes').milliseconds()
    })

    // sort treatment mills
    tmpBsalTreatments.sort((a, b) => {
      return a.mills - b.mills
    })

    return {
      profiletreatments: profTreatments,
      tempbasaltreatments: tmpBsalTreatments,
      combobolustreatments: comboBTreatments,
      profiletreatments_hash: crypto
        .createHash('sha1')
        .update(JSON.stringify(profTreatments))
        .digest('hex'),
      tempbasaltreatments_hash: crypto
        .createHash('sha1')
        .update(JSON.stringify(tmpBsalTreatments))
        .digest('hex'),
      combobolustreatments_hash: crypto
        .createHash('sha1')
        .update(JSON.stringify(comboBTreatments))
        .digest('hex')
    }
  },
  /**
   *
   * @param {*} profileData
   */
  loadData(profileData) {
    let data = null
    if (profileData && profileData.length) {
      data = this.convertToProfileStore(profileData)
      console.log('ConvertedToProfileStore', data)

      data.forEach(record => {
        each(record.store, preprocessProfileOnLoad)
        record.mills = new Date(record.startDate).getTime()
      })
    }

    return data
  },
  /**
   *
   * @param {*} dataArray
   */
  convertToProfileStore(dataArray) {
    let convertedProfiles = []

    dataArray.forEach(profile => {
      if (!profile.defaultProfile) {
        let newObject = {
          defaultProfile: 'Default',
          store: {},
          startDate: profile.startDate,
          _id: profile._id,
          convertedOnTheFly: true
        }

        delete profile.startDate
        delete profile._id
        delete profile.created_at

        newObject.store['Default'] = profile
        convertedProfiles.push(newObject)

        console.log('Profile not updated yet. Converted profile:', newObject)
      } else {
        delete profile.convertedOnTheFly
        convertedProfiles.push(profile)
      }
    })

    return convertedProfiles
  },
  /**
   *
   */
  hasData() {
    let profile = store.state.data.profile
    return profile.data ? true : false
  },
  /**
   *
   * @param {*} time
   * @param {*} spec_profile
   */
  getCurrentProfile(time, spec_profile) {
    const dataStore = store.state.data
    time = time || new Date().getTime()

    let data = this.hasData() ? dataStore.profile.data[0] : null
    let timeprofile = spec_profile || this.activeProfileToTime(time)

    return data && data.store[timeprofile] ? data.store[timeprofile] : {}
  },
  /**
   *
   * @param {*} time
   */
  activeProfileToTime(time) {
    if (this.hasData()) {
      const profile = store.state.data.profile
      let timeProfile = profile.data[0].defaultProfile

      time = Number(time) || new Date().getTime()
      let treatment = this.activeProfileTreatmentToTime(time)
      if (
        treatment &&
        profile.data[0].store &&
        profile.data[0].store[treatment.profile]
      ) {
        timeProfile = treatment.profile
      }

      return timeProfile
    }
  },
  /**
   *
   * @param {*} time
   */
  activeProfileTreatmentToTime(time) {
    const profile = store.state.data.profile
    // let cacheKey = `profile${time}${profile.profiletreatments_hash}`
    let returnValue

    if (returnValue) {
      return returnValue
    }

    let treatment = null
    if (this.hasData()) {
      profile.profiletreatments.forEach(t => {
        if (time >= t.mills && t.mills >= profile.data[0].mills) {
          let duration = moment
            .duration(t.duration || 0, 'minutes')
            .asMilliseconds()
          if (duration != 0 && time < t.mills + duration) {
            treatment = t
            // if profile switch contains json of profile inject it in to store to be findable by profile name
            if (
              treatment.profileJson &&
              !profile.data[0].store[treatment.profile]
            ) {
              if (treatment.profile.indexOf('@@@@@') < 0) {
                treatment.profile += '@@@@@' + treatment.mills
              }
              let json = JSON.parse(treatment.profileJson)
              profile.data[0].store[treatment.profile] = json
            }
          }

          if (duration == 0) {
            treatment = t
            // if profile switch contains json of profile inject it in to store to be findable by profile name
            if (
              treatment.profileJson &&
              !profile.data[0].store[treatment.profile]
            ) {
              if (treatment.profile.indexOf('@@@@@') < 0) {
                treatment.profile += '@@@@@' + treatment.mills
              }
              let json = JSON.parse(treatment.profileJson)
              profile.data[0].store[treatment.profile] = json
            }
          }
        }
      })
    }

    returnValue = treatment
    // TODO: add cache
    // cache.put(cachekey, returnValue, cacheTTL)
    return returnValue
  },
  /**
   *
   * @param {*} time
   * @param {*} valueType
   * @param {*} spec_profile
   */
  getValueByTime(time, valueType, spec_profile) {
    if (!time) time = Date.now()

    const profile = store.state.data.profile

    // CircadianPercentageProfile support
    let timeShift = 0
    let percentage = 100
    let activeTreatment = this.activeProfileTreatmentToTime(time)
    let isCcpProfile =
      !spec_profile &&
      activeTreatment &&
      activeTreatment.CircadianPercentageProfile

    if (isCcpProfile) {
      percentage = activeTreatment.percentage
      timeShift = activeTreatment.timeshift // in hours
    }

    let offset = timeShift % 24
    time = time + offset * moment.duration(offset, 'hours').asMilliseconds()

    // round to the minut for better caching
    let minuteTime = Math.round(time / 60000) * 60000

    // TODO: Add cache
    // let cacheKey = (minuteTime + valueType + spec_profile + profile.profiletreatments_hash)
    let returnValue // = cache.get(cacheKey)

    if (returnValue) {
      return returnValue
    }

    let valueContainer = this.getCurrentProfile(time, spec_profile)[valueType]

    // Assumes the timestamps are in UTC
    // Use local time zone if profile doesn't contain a time zone
    // This WILL break on the server; added warnings elsewhere that this is missing
    // TODO: Better warnings to user for missing configuration

    let t = this.getTimezone(spec_profile)
      ? moment.tz(minuteTime, this.getTimezone(spec_profile))
      : moment(minuteTime)

    // convert to seconds from midnight
    let mmtMidnight = t.clone().startOf('day')
    let timeAsSecondsFromMidnight = t.clone().diff(mmtMidnight, 'seconds')

    // if the container is an Array, assume it's a valid timestamped value container

    returnValue = valueContainer

    if (Object.prototype.toString.call(valueContainer) === '[object Array]') {
      each(valueContainer, value => {
        if (timeAsSecondsFromMidnight >= value.timeAsSeconds) {
          returnValue = value.value
        }
      })
    }

    if (returnValue) {
      returnValue = parseFloat(returnValue)

      if (isCcpProfile) {
        switch (valueType) {
          case 'sens':
          case 'carbratio':
            returnValue = (returnValue * 100) / percentage
            break
          case 'basal':
            returnValue = (returnValue * percentage) / 100
            break
        }
      }
    }

    // TODO: Add Cache
    // caches.puth(cacheKey, returnValue, cacheTTL)

    return returnValue
  },
  /**
   *
   * @param {*} spec_profile
   */
  getTimezone(spec_profile) {
    return this.getCurrentProfile(null, spec_profile)['timezone']
  },
  /**
   *
   * @param {*} time
   * @param {*} spec_profile
   */
  getSensitivity(time, spec_profile) {
    return this.getValueByTime(Number(time), 'sens', spec_profile)
  },
  /**
   *
   * @param {*} time
   * @param {*} spec_profile
   */
  getHighBGTarget(time, spec_profile) {
    return this.getValueByTime(Number(time), 'target_high', spec_profile)
  },
  /**
   *
   * @param {*} time
   * @param {*} spec_profile
   */
  getLowBGTarget(time, spec_profile) {
    return this.getValueByTime(Number(time), 'target_low', spec_profile)
  },
  /**
   *
   * @param {*} time
   * @param {*} spec_profile
   */
  getDIA(time, spec_profile) {
    return this.getValueByTime(Number(time), 'dia', spec_profile)
  },
  /**
   *
   * @param {*} time
   * @param {*} spec_profile
   */
  getBasal(time, spec_profile) {
    return this.getValueByTime(Number(time), 'basal', spec_profile)
  },
  /**
   *
   * @param {*} time
   * @param {*} spec_profile
   */
  getCarbRatio(time, spec_profile) {
    return this.getValueByTime(Number(time), 'carbratio', spec_profile)
  },
  /**
   *
   */
  profileFieldsMissing() {
    const initTime = store.state.initTime

    return (
      !this.getSensitivity(initTime) ||
      !this.getHighBGTarget(initTime) ||
      !this.getLowBGTarget(initTime)
    )
  }
}
