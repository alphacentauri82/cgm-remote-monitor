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

    <span v-if="info.length > 0">
      <div class="tooltip-info" v-for="(inf, index) in info" :key="index">
        <strong>{{ inf.label }}</strong>
        {{ inf.value }}
      </div>
    </span>
  </v-tooltip>
</template>

<script>
import { mapState } from 'vuex'
import { each, isEmpty, sortBy, last } from 'lodash'
import LevelsHelper from '@/utils/levels.helper.js'
const moment = require('moment')

export default {
  name: 'SensorAgePlugin',
  data() {
    return {
      sage: {},
      value: 0,
      label: '',
      info: [],
      status: ''
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
    ...mapState({
      lastUpdated: state => state.data.lastUpdated,
      serverSettings: state => state.serverSettings,
      dataSource: state => state.data,
      initTime: state => state.initTime
    })
  },
  methods: {
    updateVisualisation() {
      this.sage = this.findLatestTimeChange()
      const eventsArr = ['Sensor Change', 'Sensor Start']
      let sensorInfo = this.sage[this.sage.min]
      let info = []

      eventsArr.forEach(event => {
        if (this.sage[event].found) {
          let label = event === 'Sensor Change' ? 'Sensor Insert' : event
          info.push({
            label, // TODO: translate
            value: new Date(this.sage[event].treatmentDate).toLocaleString()
          })
          info.push({
            label: 'Duration', // TODO translate
            value: this.sage[event].displayLong
          })

          if (!isEmpty(this.sage[event].notes)) {
            info.push({ label: 'Notes', value: this.sage[event].notes })
          }
        }
      })

      let statusClass = null
      if (sensorInfo.level === LevelsHelper.levels.URGENT) {
        statusClass = 'urgent'
      } else if (sensorInfo.level === LevelsHelper.levels.WARN) {
        statusClass = 'warn'
      }

      this.value = sensorInfo.display
      this.label = 'SAGE' // TODO: translate
      this.info = info
      this.status = statusClass
    },
    getPrefs() {
      const extendedSettings =
        this.serverSettings.extendedSettings['sage'] || {}

      return {
        info: extendedSettings.info || moment.duration(6, 'days').asHours(),
        warn: extendedSettings.warn || moment.duration(7, 'days').asHours() - 4,
        urgent:
          extendedSettings.urgent || moment.duration(7, 'days').asHours() - 2,
        enableAlerts: extendedSettings.enableAlerts || false
      }
    },
    findLatestTimeChange() {
      const returnValue = {
        'Sensor Start': { found: false },
        'Sensor Change': { found: false }
      }

      const prevDate = {
        'Sensor Start': 0,
        'Sensor Change': 0
      }

      each(this.dataSource.sensorTreatments, treatment => {
        ;['Sensor Start', 'Sensor Change'].forEach(event => {
          let treatmentDate = treatment.mills
          if (
            treatment.eventType === event &&
            treatmentDate > prevDate[event] &&
            treatmentDate <= this.initTime
          ) {
            prevDate[event] = treatmentDate

            let a = moment(this.initTime)
            let b = moment(treatmentDate)
            let days = a.diff(b, 'days')
            let hours = a.diff(b, 'hours') - days * 24
            let age = a.diff(b, 'hours')

            let eventValue = returnValue[event]

            if (!eventValue.found || (age >= 0 && age < eventValue.age)) {
              eventValue.found = true
              eventValue.treatmentDate = treatmentDate
              eventValue.age = age
              eventValue.days = days
              eventValue.hours = hours
              eventValue.notes = treatment.notes
              eventValue.minFractioins = a.diff(b, 'minutes') - age * 60
              eventValue.display = ''

              if (eventValue.age >= 24) {
                eventValue.display += eventValue.days + 'd'
              }
              eventValue.display += eventValue.hours + 'h'
              eventValue.displayLong = ''

              if (eventValue.age >= 24) {
                eventValue.displayLong += eventValue.days + ' ' + 'days' // TODO: translate days
              }
              if (eventValue.displayLong.length > 0) {
                eventValue.displayLong += ' '
              }
              eventValue.displayLong += eventValue.hours + ' ' + 'hours' // TODO: translate  hours
            }
          }
        })
      })

      if (
        returnValue['Sensor Change'].found &&
        returnValue['Sensor Start'].found &&
        returnValue['Sensor Change'].treatmentDate >=
          returnValue['Sensor Start'].treatmentDate
      ) {
        returnValue['Sensor Start'].found = false
      }

      returnValue.min = this.minButValid(returnValue)

      let sensorInfo = returnValue[returnValue.min]
      let prefs = this.getPrefs()
      let sendNotification = false
      let sound = 'incoming'
      let message

      sensorInfo.level = LevelsHelper.levels.NONE

      if (sensorInfo.age >= prefs.urgent) {
        sendNotification = sensorInfo.age === prefs.urgent
        message = 'Sensor change/restart overdue!' // TODO translate
        sound = 'persistent'
        sensorInfo.level = LevelsHelper.levels.URGENT
      } else if (sensorInfo.age >= prefs.warn) {
        sendNotification = sensorInfo.age === prefs.warn
        message = 'Time to change/restart sensor' // TODO translate
        sensorInfo.level = LevelsHelper.levels.WARN
      } else if (sensorInfo.age >= prefs.info) {
        sendNotification = sensorInfo.age === prefs.info
        message = 'Change/restart sensor soon' // TODO translate
        sensorInfo.level = LevelsHelper.levels.INFO
      }

      // allow for 20 minutes period after a full hour during which we'll alert the user
      if (
        prefs.enableAlerts &&
        sendNotification &&
        sensorInfo.minFractioins <= 20
      ) {
        sensorInfo.notification = {
          title: `Sensor age ${sensorInfo.days} days ${sensorInfo.hours} hours`,
          message,
          pushoverSound: sound,
          level: sensorInfo.level,
          group: 'SAGE'
        }
      }

      return returnValue
    },
    minButValid(record) {
      let events = []
      let start = record['Sensor Start']
      if (start && start.found) {
        events.push({
          eventType: 'Sensor Start',
          treatmentDate: start.treatmentDate
        })
      }

      let change = record['Sensor Change']
      if (change && change.found) {
        events.push({
          eventType: 'Sensor Change',
          treatmentDate: change.treatmentDate
        })
      }

      let sorted = sortBy(events, 'treatmentDate')
      let mostRecent = last(sorted)

      return (mostRecent && mostRecent.eventType) || 'Sensor Start'
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
  padding: 0 7px;
  width: auto !important;
}
</style>
