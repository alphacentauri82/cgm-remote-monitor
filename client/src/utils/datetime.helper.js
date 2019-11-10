import store from '@/store/store'
const moment = require('moment')

const UPDATE_TRANS_MS = 750 // milliseconds
const FORMAT_TIME_12 = 'h:mm A' // '%-I:%M %p'
const FORMAT_TIME_12_COMPACT = 'h:mm' // '%-I:%M'
const FORMAT_TIME_24 = 'HH:mm' // '%H:%M%'
const FORMAT_TIME_12_SCALE = 'h A' // '%-I %p'
const FORMAT_TIME_24_SCALE = 'HH' // '%H'

const oneMinute = moment.duration(1, 'minutes').asMilliseconds()
const twoMinutes = moment.duration(2, 'minutes').asMilliseconds()
const oneHour = moment.duration(1, 'hour').asMilliseconds()
const twoHours = moment.duration(2, 'hours').asMilliseconds()
const oneDay = moment.duration(1, 'day').asMilliseconds()
const twoDays = moment.duration(2, 'days').asMilliseconds()
const oneWeek = moment.duration(1, 'week').asMilliseconds()

const isMissing = opts => {
  if (
    !opts ||
    !opts.entry ||
    isNaN(opts.entry.mills) ||
    isNaN(opts.time) ||
    isNaN(opts.timeSince)
  ) {
    // TODO: add translate features
    return {
      label: 'time ago',
      shortLabel: 'ago'
    }
  }
}

const inTheFuture = opts => {
  if (
    opts.entry.mills - moment.duration(5, 'minutes').milliseconds() >
    opts.time
  ) {
    // TODO: add translations
    return {
      label: 'in the future',
      shortLabel: 'future'
    }
  }
}

const almostInTheFuture = opts => {
  if (opts.entry.mills > opts.time) {
    return {
      value: 1,
      label: 'min ago',
      shortLabel: 'm'
    }
  }
}

const isLessThan = (limit, divisor, label, shortLabel) => {
  return function checkIsLessThan(opts) {
    if (opts.timeSince < limit) {
      return {
        value: Math.max(1, Math.round(opts.timeSince / divisor)),
        label: label,
        shortLabel: shortLabel
      }
    }
  }
}

const resolvers = [
  isMissing,
  inTheFuture,
  almostInTheFuture,
  isLessThan(twoMinutes, oneMinute, 'min ago', 'm'),
  isLessThan(oneHour, oneMinute, 'mins ago', 'm'),
  isLessThan(twoHours, oneHour, 'hour ago', 'h'),
  isLessThan(oneDay, oneHour, 'hours ago', 'h'),
  isLessThan(twoDays, oneDay, 'day ago', 'd'),
  isLessThan(oneWeek, oneDay, 'days ago', 'd'),
  function() {
    return {
      label: 'long ago',
      shortLabel: 'ago'
    }
  }
]

export default {
  /**
   *
   * @param {*} isForScale
   * @param {*} compact
   */
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
  /**
   *
   * @param {*} time
   * @param {*} compact
   */
  formatTime(time, compact) {
    // getting the time format
    const timeFormat = this.getTimeFormat(false, compact)

    // formatting the time
    time = moment(time).format(timeFormat)

    if (store.state.settings.timeFormat !== 24) {
      time = time.toLowerCase()
    }

    return time
  },
  calcDisplay(entry, time) {
    const opts = {
      time: time,
      entry: entry
    }

    if (time && entry && entry.mills) {
      opts.timeSince = time - entry.mills
    }

    for (let i = 0; i < resolvers.length; i++) {
      let value = resolvers[i](opts)
      if (value) {
        return value
      }
    }
  },
  /**
   *
   * @param {*} momentTime
   * @param {*} inRetroMode
   * @param {*} initTime
   */
  formatPumpTime(momentTime, inRetroMode, initTime) {
    let when

    if (momentTime && inRetroMode) {
      when = momentTime.format('LT')
    } else if (momentTime) {
      let ago = this.calcDisplay({ mills: momentTime.valueOf() }, initTime)
      when = `${ago.value ? ago.value : ''} ${ago.shortLabel} ${
        ago.shortLabel.length === 1 ? 'ago' : ''
      }`
    } else {
      when = 'unknown'
    }

    return when
  }
}
