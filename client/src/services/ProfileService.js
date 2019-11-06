// import store from '@/store/store'
import uniqBy from 'lodash/uniqBy'
import each from 'lodash/each'
const moment = require('moment')
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
  }
}
