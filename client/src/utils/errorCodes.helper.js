const code2Display = {
  1: '?SN', //SENSOR_NOT_ACTIVE
  2: '?MD', //MINIMAL_DEVIATION
  3: '?NA', //NO_ANTENNA
  5: '?NC', //SENSOR_NOT_CALIBRATED
  6: '?CD', //COUNTS_DEVIATION
  9: '?AD', //ABSOLUTE_DEVIATION
  10: '???', //POWER_DEVIATION
  12: '?RF' //BAD_RF
}

const code2PushoverSound = {
  5: 'intermission',
  9: 'alien',
  10: 'alien'
}

export default {
  code2Display,
  code2PushoverSound,
  /**
   *
   * @param {*} errorCode
   */
  toDisplay(errorCode) {
    return code2Display[errorCode] || `${errorCode}??`
  }
}
