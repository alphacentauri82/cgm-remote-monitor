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
import { each, isEmpty } from 'lodash'
import LevelsHelper from '@/utils/levels.helper.js'
const moment = require('moment')

export default {
  name: 'CannulaAgePlugin',
  data() {
    return {
      cage: {},
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
      this.cage = this.findLatestTimeChange()

      let info = [
        {
          label: 'Inserted', // TODO: translate
          value: new Date(this.cage.treatmentDate).toLocaleString()
        }
      ]

      if (!isEmpty(this.cage.notes)) {
        info.push({
          label: 'Notes', // TODO: translate
          value: this.cage.notes
        })
      }

      let statusClass = null
      if (this.cage.level === LevelsHelper.levels.URGENT) {
        statusClass = 'urgent'
      } else if (this.cage.level === LevelsHelper.levels.WARN) {
        statusClass = 'warn'
      }

      this.value = this.cage.display
      this.label = 'CAGE' // TODO: translate
      this.info = info
      this.status = statusClass
    },
    getPrefs() {
      const extendedSettings =
        this.serverSettings.extendedSettings['cage'] || {}

      return {
        info: extendedSettings.info || 44,
        warn: extendedSettings.warn || 48,
        urgent: extendedSettings.urgent || 72,
        display: extendedSettings.display ? extendedSettings.display : 'hours',
        enableAlerts: extendedSettings.enableAlerts || false
      }
    },
    findLatestTimeChange() {
      let prefs = this.getPrefs()
      let prevDate = 0
      let cannulaInfo = {
        found: false,
        age: 0,
        treatmentDate: null,
        checkForAlert: false
      }

      each(this.dataSource.sitechangeTreatments, treatment => {
        let treatmentDate = treatment.mills
        if (treatmentDate > prevDate && treatmentDate <= this.initTime) {
          prevDate = treatmentDate
          cannulaInfo.treatmentDate = treatmentDate

          let a = moment(this.initTime)
          let b = moment(cannulaInfo.treatmentDate)
          let days = a.diff(b, 'days')
          let hours = a.diff(b, 'hours') - days * 24
          let age = a.diff(b, 'hours')

          if (!cannulaInfo.found || (age >= 0 && age < cannulaInfo.age)) {
            cannulaInfo.found = true
            cannulaInfo.age = age
            cannulaInfo.days = days
            cannulaInfo.hours = hours
            cannulaInfo.notes = treatment.notes
            cannulaInfo.minFractions = a.diff(b, 'minutes') - age * 60
          }
        }
      })

      cannulaInfo.level = LevelsHelper.Levels.NONE
      let sound = 'incoming'
      let message
      let sendNotification = false

      if (cannulaInfo.age >= prefs.urgent) {
        sendNotification = cannulaInfo.age === prefs.urgent
        message = 'Cannula change overdue!' // TODO: translate
        sound = 'persistent'
        cannulaInfo.level = LevelsHelper.levels.URGENT
      } else if (cannulaInfo.age >= prefs.warn) {
        sendNotification = cannulaInfo.age === prefs.warn
        message = 'Time to change cannula' // TODO: translate
        cannulaInfo.level = LevelsHelper.levels.WARN
      } else if (cannulaInfo.age >= prefs.info) {
        sendNotification = cannulaInfo.age === prefs.info
        message = 'Change cannula soon'
        cannulaInfo.level = LevelsHelper.levels.INFO
      }

      if (prefs.display === 'days' && cannulaInfo.found) {
        cannulaInfo.display = ''
        if (cannulaInfo.age >= 24) {
          cannulaInfo.display += cannulaInfo.days + 'd'
        }
        cannulaInfo.display += cannulaInfo.hours + 'h'
      } else {
        cannulaInfo.display = cannulaInfo.found ? cannulaInfo.age + 'h' : 'n/a'
      }

      // allow for 20 minutes period after a full hour during during which we'll alert the user
      if (
        prefs.enableAlerts &&
        sendNotification &&
        cannulaInfo.minFractions <= 20
      ) {
        cannulaInfo.notification = {
          title: `Cannula age ${cannulaInfo.age} hours`, // TODO: translate
          message,
          pushoverSound: sound,
          level: cannulaInfo.level,
          group: 'CAGE'
        }
      }
      return cannulaInfo
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

<style scoped></style>
