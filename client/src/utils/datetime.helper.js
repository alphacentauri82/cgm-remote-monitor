import store from '@/store/store'
const moment = require('moment')

const UPDATE_TRANS_MS = 750 // milliseconds
const FORMAT_TIME_12 = 'h:mm A' // '%-I:%M %p'
const FORMAT_TIME_12_COMPACT = 'h:mm' // '%-I:%M'
const FORMAT_TIME_24 = 'HH:mm' // '%H:%M%'
const FORMAT_TIME_12_SCALE = 'h A' // '%-I %p'
const FORMAT_TIME_24_SCALE = 'HH' // '%H'

export default {
  getTimeFormat(isForScale, compact) {
    let timeFormat = FORMAT_TIME_12

    if (store.state.settings.timeFormat === 24) {
      timeFormat = isForScale ? FORMAT_TIME_24_SCALE : FORMAT_TIME_24
    } else {
      timeFormat = isForScale
        ? FORMAT_TIME_12_SCALE
        : compact
        ? FORMAT_TIME_12_COMPACT
        : FORMAT_TIME_12
    }

    return timeFormat
  },
  formatTime(time, compact) {
    // getting the time format
    const timeFormat = this.getTimeFormat(false, compact)

    // formatting the time
    time = moment(time).format(timeFormat)

    if (store.state.settings.timeFormat !== 24) {
      time = time.toLowerCase()
    }

    return time
  }
}
