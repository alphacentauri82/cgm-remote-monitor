<template>
  <v-tooltip top open-on-click>
    <template v-slot:activator="{ on }">
      <v-chip :color="stateColor" v-on="on">
        <v-avatar
          :class="stateColor == 'default' ? 'grey' : stateColor"
          class="darken-3"
          left
          >{{ value }}</v-avatar
        >
        {{ label }}
      </v-chip>
    </template>

    <span v-if="cleanedInfo.length > 0">
      <div
        class="tooltip-info"
        v-for="(inf, index) in cleanedInfo"
        :key="index"
      >
        <strong>{{ inf.label }}</strong>
        {{ inf.value }}
      </div>
    </span>
  </v-tooltip>
</template>

<script>
import { mapState } from 'vuex'
import {
  chain,
  isArray,
  forEach,
  includes,
  forIn,
  maxBy,
  sortBy,
  compact,
  map,
  get
} from 'lodash'
import _isEmpty from 'lodash/isEmpty'
import DataService from '@/services/DataService.js'
import LevelsHelper from '@/utils/levels.helper.js'
import DateTimeHelper from '@/utils/datetime.helper.js'
const moment = require('moment')

const cleanList = value => {
  return decodeURIComponent(value || '')
    .toLowerCase()
    .split(' ')
}

const isEmpty = list => {
  return _isEmpty(list) || _isEmpty(list[0])
}

export default {
  name: 'OpenApsPlugin',
  data() {
    return {
      data: null,
      value: '',
      label: '',
      info: [],
      status: 'current'
    }
  },
  computed: {
    stateColor() {
      let color

      switch (this.status) {
        case 'warn':
          color = 'yellow'
          break
        case 'urgent':
          color = 'red'
          break
        default:
          color = 'default'
          break
      }

      return color
    },
    cleanedInfo() {
      return compact(this.info)
    },
    ...mapState({
      lastUpdated: state => state.data.lastUpdated,
      serverSettings: state => state.serverSettings,
      dataSource: state => state.data
    })
  },
  methods: {
    updateVisualisation() {
      this.analyzeData()

      const prop = this.data
      const inRetroMode = this.dataSource.inRetroMode
      const initTime = this.$store.state.initTime
      let prefs = this.getPrefs()
      let selectedFields = inRetroMode ? prefs.retroFields : prefs.fields

      let events = []

      if ('enacted' === prop.status.code) {
        let canceled =
          prop.lastEnacted.rate === 0 && prop.lastEnacted.duration === 0

        let valueParts = [
          this.valueString('BG: ', prop.lastEnacted.bg),
          ', <b>Temp Basal' + (canceled ? 'Canceled' : 'Started') + '</b>',
          canceled
            ? ''
            : ` ${prop.lastEnacted.rate.toFixed(2)} for ${
                prop.lastEnacted.duration
              }m`,
          this.valueString(', ', prop.lastEnacted.reason),
          prop.lastEnacted.mealAssist && includes(selectedFields, 'meal-assist')
            ? `<b>Meal Assist:</b> ${prop.lastEnacted.mealAssist}`
            : ''
        ]

        if (
          prop.lastSuggested &&
          prop.lastSuggested.moment.isAfter(prop.lastEnacted.moment)
        ) {
          events.push(this.addSuggestion(prop, selectedFields))
        } else {
          valueParts = this.concatIOB(prop, valueParts)
        }

        events.push({
          time: prop.lastEnacted.moment,
          value: valueParts.join('')
        })
      } else {
        events.push(this.addSuggestion(prop, selectedFields))
      }

      forIn(prop.seenDevices, device => {
        let deviceInfo = [device.name]

        if (includes(selectedFields, 'status-symbol')) {
          deviceInfo.push(device.status.symbol)
        }
        if (includes(selectedFields, 'status-label')) {
          deviceInfo.push(device.status.label)
        }

        if (device.mmtune) {
          let best = maxBy(device.mmtune.scanDetails, d => {
            return d[2]
          })

          if (includes(selectedFields, 'freq')) {
            deviceInfo.push(device.mmtune.setFreq + 'MHz')
          }
          if (best && best.length > 2 && includes(selectedFields, 'rssi')) {
            deviceInfo.push('@' + best[2] + 'dB')
          }
        }
        events.push({ time: device.status.when, value: deviceInfo.join(' ') })
      })

      let sorted = sortBy(events, t => {
        // returning millisecs
        if (t != undefined && 'time' in t) {
          return t.time.valueOf()
        }
      }).reverse()

      let info = map(sorted, et => {
        // converting events into Info
        if (et && 'time' in et) {
          return {
            label:
              DateTimeHelper.timeAt(false, inRetroMode) +
              DateTimeHelper.formatPumpTime(et.time, inRetroMode, initTime),
            value: et.value
          }
        }
      })

      // generating the label
      let label = 'OpenAPS'
      if (includes(selectedFields, 'status-symbol')) {
        label += ' ' + prop.status.symbol
      }

      this.value = DateTimeHelper.formatPumpTime(
        prop.lastLoopMoment,
        inRetroMode,
        initTime
      )
      // updating label, info and status
      this.label = label
      this.info = info
      this.updateStatus(prop, prefs)

      // creating the Forecast Points and storing them in the application Store
      this.$store.dispatch(
        'data/updateOpenAPSForecastPoints',
        this.getForecastPoints(prop, prefs)
      )
    },
    analyzeData() {
      const initTime = this.$store.state.initTime
      let recentHours = 6 // TODO: day * 2
      let recentMills =
        initTime - moment.duration(recentHours, 'hours').asMilliseconds()

      let recentData = []
      if (this.dataSource.devicestatus.length > 0) {
        recentData = chain(this.dataSource.devicestatus)
          .filter(status => {
            return (
              'openaps' in status &&
              DataService.entryMills(status) <= initTime &&
              DataService.entryMills(status) >= recentMills
            )
          })
          .map(status => {
            if (
              status.openaps &&
              isArray(status.openaps.iob) &&
              status.openaps.iob.length > 0
            ) {
              status.openaps.iob = status.openaps.iob[0]
              if (status.openaps.iob.time) {
                status.openaps.iob.timestamp = status.openaps.iob.time
              }
            }
            return status
          })
          .value()
      }

      let prefs = this.getPrefs()
      let recent = moment(initTime).subtract(prefs.warn / 2, 'minutes')

      let result = {
        seenDevices: {},
        lastEnacted: null,
        lastNotEnacted: null,
        lastSugested: null,
        lastIOB: null,
        lastMMTune: null,
        lastPredBGs: null
      }

      forEach(recentData, status => {
        let device = this.getDevice(status, result)
        let moments = DateTimeHelper.openapsToMoments(status)
        let loopStatus = DateTimeHelper.momentsToLoopStatus(
          moments,
          true,
          recent
        )

        if (!device.status || moments.when.isAfter(device.status.when)) {
          device.status = loopStatus
          device.status.when = moments.when
        }

        let enacted = status.openaps && status.openaps.enacted
        if (
          enacted &&
          moments.enacted &&
          (!result.lastEnacted ||
            moments.enacted.isAfter(result.lastEnacted.moment))
        ) {
          enacted.moment = moment(enacted.timestamp)
          result.lastEnacted = enacted
          if (
            enacted.predBGs &&
            (!result.lastPredBGs ||
              enacted.moment.isAfter(result.lastPredBGs.moment))
          ) {
            result.lastPredBGs = isArray(enacted.predBGs)
              ? { values: enacted.predBGs }
              : enacted.predBGs
            result.lastPredBGs.moment = enacted.moment
          }
        }

        if (
          enacted &&
          moments.notEnacted &&
          (!result.lastNotEnacted ||
            moments.notEnacted.isAfter(result.lastNotEnacted.moment))
        ) {
          enacted.moment = moment(enacted.timestamp)
          result.lastNotEnacted = enacted
        }

        let suggested = get(status, 'openaps.suggested')
        if (
          suggested &&
          moments.suggested &&
          (!result.lastSuggested ||
            moments.suggested.isAfter(result.lastSuggested.moment))
        ) {
          suggested.moment = moment(suggested.timestamp)
          result.lastSuggested = suggested

          if (
            suggested.predBGs &&
            (!result.lastPredBGs ||
              suggested.moment.isAfter(result.lastPredBGs.moment))
          ) {
            result.lastPredBGs = isArray(suggested.predBGs)
              ? { values: suggested.predBGs }
              : suggested.predBGs
            result.lastPredBGs.moment = suggested.moment
          }
        }

        let iob = status.openaps && status.openaps.iob
        if (
          moments.iob &&
          (!result.lastIOB ||
            moment(iob.timestamp).isAfter(result.lastIOB.moment))
        ) {
          iob.moment = moments.iob
          result.lastIOB = iob
        }

        if (status.mmtune && status.mmtune.timestamp) {
          status.mmtune.moment = moment(status.mmtune.timestamp)
          if (!device.mmtune || moments.when.isAfter(device.mmtune.moment)) {
            device.mmtune = status.mmtune
          }
        }
      })

      if (result.lastEnacted && result.lastSuggested) {
        if (result.lastEnacted.moment.isAfter(result.lastSuggested.moment)) {
          result.lastLoopMoment = result.lastEnacted.moment
          result.lastEventualBG = result.lastEnacted.eventualBG
        } else {
          result.lastLoopMoment = result.lastSuggested.moment
          result.lastEventualBG = result.lastSuggested.eventualBG
        }
      } else if (result.lastEnacted && result.lastEnacted.moment) {
        result.lastLoopMoment = result.lastEnacted.moment
        result.lastEventualBG = result.lastEnacted.eventualBG
      } else if (result.lastSuggested && result.lastSuggested.moment) {
        result.lastLoopMoment = result.lastSuggested.moment
        result.lastEventualBG = result.lastSuggested.eventualBG
      }

      result.status = DateTimeHelper.momentsToLoopStatus(
        {
          enacted: get(result, 'lastEnacted.moment'),
          notEnacted: get(result, 'lastNotEnacted.moment'),
          suggested: get(result, 'lastSuggested.moment')
        },
        false,
        recent
      )

      this.data = result
    },
    getPrefs() {
      const extendedSettings =
        this.serverSettings.extendedSettings['openaps'] || {}

      let fields = cleanList(extendedSettings.fields)
      fields = isEmpty(fields)
        ? ['status-symbol', 'status-label', 'iob', 'meal-assist', 'rssi']
        : fields

      let retroFields = cleanList(extendedSettings.retroFields)
      retroFields = isEmpty(retroFields)
        ? ['status-symbol', 'status-label', 'iob', 'meal-assist', 'rssi']
        : retroFields

      if (typeof extendedSettings.colorPredictionLines == 'undefined') {
        extendedSettings.colorPredictionLines = true
      }

      return {
        fields,
        retroFields,
        warn:
          extendedSettings && extendedSettings.warn
            ? extendedSettings.warn
            : 30,
        urgent:
          extendedSettings && extendedSettings.urgent
            ? extendedSettings.urgent
            : 60,
        enableAlerts: extendedSettings ? extendedSettings.enableAlerts : false,
        predIOBColor:
          extendedSettings && extendedSettings.predIOBColor
            ? extendedSettings.predIOBColor
            : '#1e88e5',
        predCOBColor:
          extendedSettings && extendedSettings.predCobColor
            ? extendedSettings.predCobColor
            : '#FB8C00FF',
        predACOBColor:
          extendedSettings && extendedSettings.predAcobColor
            ? extendedSettings.predAcobColor
            : '#Fb8C0080',
        predZTColor:
          extendedSettings && extendedSettings.predZtColor
            ? extendedSettings.predZtColor
            : '#00d2d2',
        predUAMColor:
          extendedSettings && extendedSettings.predUamColor
            ? extendedSettings.predUamColor
            : '#c9bd60'.predUamColor,
        colorPredictionLines:
          extendedSettings && extendedSettings.colorPredictionLines
      }
    },
    getDevice(status, result) {
      let uri = status.device || 'device'
      let device = result.seenDevices[uri]

      if (!device) {
        device = {
          name: DataService.getDeviceName(uri),
          uri
        }

        result.seenDevices[uri] = device
      }

      return device
    },
    valueString(prefix, value) {
      return value ? prefix + value : ''
    },
    addSuggestion(prop, selectedFields) {
      if (prop.lastSuggested) {
        let bg = prop.lastSuggested.bg
        if (this.dataSource.profile.data[0].units === 'mmol') {
          bg = Math.round((bg / 18) * 10) / 10
        }

        let valueParts = [
          this.valueString('Bg: ', bg),
          this.valueString(', ', prop.lastSuggested.reason),
          prop.lastSuggested.sensitivityRatio
            ? ', <b>Sensitivity Ratio:</b> ' +
              prop.lastSuggested.sensitivityRatio
            : ''
        ]

        if (includes(selectedFields, 'iob')) {
          valueParts = this.concatIOB(prop, valueParts)
        }

        return {
          time: prop.lastSuggested.moment,
          value: valueParts.join('')
        }
      }
    },
    concatIOB(prop, valueParts) {
      if (prop.lastIOB) {
        valueParts = valueParts.concat([
          ', IOB: ',
          DataService.roundInsulinForDisplayFormat(prop.lastIOB.iob) + 'U',
          prop.lastIOB.basaliob
            ? 'Basal IOB ' +
              DataService.roundInsulinForDisplayFormat(prop.lastIOB.basaliob) +
              'U'
            : '',
          prop.lastIOB.bolusiob
            ? ', Bolus IOB ' +
              DataService.roundInsulinForDisplayFormat(prop.lastIOB.bolusiob) +
              'U'
            : ''
        ])
      }

      return valueParts
    },
    updateStatus(prop, prefs) {
      let level = LevelsHelper.levels.NONE
      let now = this.$store.state.initTime

      if (DataService.findOfflineMarker()) {
        console.info('OpenAPS known offline, not checking for alerts')
      } else if (prop.lastLoopMoment) {
        let urgentTime = prop.lastLoopMoment
          .clone()
          .add(prefs.urgent, 'minutes')
        let warningTime = prop.lastLoopMoment.clone().add(prefs.warn, 'minutes')

        if (urgentTime.isBefore(now)) {
          level = LevelsHelper.levels.URGENT
        } else if (warningTime.isBefore(now)) {
          level = LevelsHelper.levels.WARN
        }
      }

      this.status = LevelsHelper.toStatusClass(level)
    },
    getForecastPoints(prop, prefs) {
      let points = []

      const toPoints = (offset, forecastType) => {
        return (value, index) => {
          let colors = {
            Values: '#ff00ff',
            IOB: prefs.predIOBColor,
            'Zero-Temp': prefs.predZTColor,
            COB: prefs.predCOBColor,
            'Accel-COB': prefs.predACOBColor,
            UAM: prefs.predUAMColor
          }

          return {
            mgdl: value,
            color: prefs.colorPredictionLines
              ? colors[forecastType]
              : '#ff00ff',
            mills:
              prop.lastPredBGs.moment.valueOf() +
              moment.duration(5 * index, 'minutes').asMilliseconds() +
              offset,
            noFade: true,
            forecastType
          }
        }
      }

      if (prop.lastPredBGs) {
        if (prop.lastPredBGs.values) {
          points = points.concat(
            map(get(prop, 'lastPredBGs.values', toPoints(0, 'Values')))
          )
        }
        if (get(prop, 'lastPredBGs.IOB')) {
          points = points.concat(
            map(get(prop, 'lastPredBGs.IOB'), toPoints(3333, 'IOB'))
          )
        }
        if (get(prop, 'lastPredBGs.ZT')) {
          points = points.concat(
            map(get(prop, 'lastPredBGs.ZT'), toPoints(4444, 'Zero-Temp'))
          )
        }
        if (get(prop, 'lastPredBGs.aCOB')) {
          points = points.concat(
            map(get(prop, 'lastPredBGs.aCOB'), toPoints(5555, 'Accel-COB'))
          )
        }
        if (get(prop, 'lastPredBGs.COB')) {
          points = points.concat(
            map(get(prop, 'lastPredBGs.COB'), toPoints(7777, 'COB'))
          )
        }
        if (get(prop, 'lastPredBGs.UAM')) {
          points = points.concat(
            map(get(prop, 'lastPredBGs.UAM'), toPoints(9999, 'UAM'))
          )
        }
      }
      return points
    }
  },
  watch: {
    lastUpdated: function(newValue) {
      if (newValue) {
        this.updateVisualisation()
      }
    }
  }
}
</script>

<style scoped>
.v-chip .v-avatar {
  border-radius: 25%;
  height: 26px !important;
  padding: 0 10px;
  width: auto !important;
}
</style>
