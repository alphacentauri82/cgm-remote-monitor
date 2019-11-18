<template>
  <v-chip :color="stateColor" text-color="white">
    <v-avatar class="grey darken-3" left :color="stateColor">
      {{ display }}
    </v-avatar>
    <template v-if="level > 90">
      <v-icon>mdi-battery</v-icon>
    </template>
    <template v-if="level > 70 && level < 90">
      <v-icon>mdi-battery-70</v-icon>
    </template>
    <template v-if="level > 45 && level < 70">
      <v-icon>mdi-battery-50</v-icon>
    </template>
    <template v-if="level > 0 && level < 45">
      <v-icon>mdi-battery-20</v-icon>
    </template>
    <template v-else-if="!level">
      <v-icon>mdi-battery-alert-variant-outline</v-icon>
    </template>
  </v-chip>
</template>

<script>
import { mapState } from 'vuex'
import filter from 'lodash/filter'
import pick from 'lodash/pick'
import sortBy from 'lodash/sortBy'
import _first from 'lodash/first'
import chain from 'lodash/chain'
import forEach from 'lodash/forEach'
import minBy from 'lodash/minBy'
const moment = require('moment')
import DataService from '@/services/DataService.js'
import LevelsHelper from '@/utils/levels.helper.js'

export default {
  name: 'UBatPlugin',
  data() {
    return {
      display: '',
      shortLabel: '',
      level: 0,
      status: 'current',
      devices: null
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
          color = 'current'
          break
      }

      return color
    },
    ...mapState({
      lastUpdated: state => state.data.lastUpdated,
      serverSettings: state => state.serverSettings,
      dataSource: state => state.data
    })
  },
  methods: {
    updateVisualisation() {
      let updateData = this.analyzeData()

      this.display = updateData.display
      this.level = updateData.level
      this.status = updateData.status
      this.devices = updateData.devices
    },
    analyzeData() {
      const initTime = this.$store.state.initTime
      let prefs = this.getPrefs()
      let recentMins = 30
      let recentMills =
        initTime - moment.duration(recentMins, 'minutes').asMilliseconds()

      let recentData = filter(this.dataSource.devicestatus, status => {
        return (
          'uploader' in status &&
          DataService.entryMills(status) <= initTime &&
          DataService.entryMills(status) >= recentMills
        )
      })

      let result = {
        level: undefined,
        display: '?%',
        status: undefined,
        devices: {}
      }

      recentData.forEach(status => {
        this.analizeStatus(status, prefs)
        let device = this.getDevice(status, result)
        device.statuses.push(
          pick(status, ['uploader', 'created_at', 'mills', '_id'])
        )
      })

      let recentLowests = []
      const byBattery = status => {
        return status.uploader.battery
      }

      forEach(result.devices, device => {
        device.statuses = sortBy(device.statuses, status => {
          return DataService.entryMills(status)
        }).reverse()

        let first = _first(device.statuses)
        let recent =
          DataService.entryMills(first) -
          moment.duration(10, 'minutes').asMilliseconds()
        let recentLowest = chain(device.statuses)
          .filter(status => {
            return DataService.entryMills(status) > recent
          })
          .minBy(byBattery)
          .value()

        device.min = recentLowest.uploader
        recentLowests.push(recentLowest)
      })

      let min = minBy(recentLowests, byBattery)
      if (min && min.uploader) {
        result.level = min.uploader.level
        result.display = min.uploader.display
        result.status = LevelsHelper.toStatusClass(min.uploader.notification)
        result.min = min.uploader
      }

      return result
    },
    getPrefs() {
      const extendedSettings =
        this.serverSettings.extendedSettings['ubat'] || {}

      return {
        warn: 'warn' in extendedSettings ? extendedSettings.warn : 30,
        urgent: 'urgent' in extendedSettings ? extendedSettings.urgent : 20,
        enableAlerts:
          'enableAlerts' in extendedSettings
            ? extendedSettings.enableAlerts
            : null
      }
    },
    getDevice(status, result) {
      let uri = status.device || 'uploader'
      let device = result.devices[uri]

      if (!device) {
        device = {
          // TODO: regex to look for any uri schemas, such as: xdrip://phone
          name:
            uri.indexOf('openaps://') === 0
              ? uri.substring('openaps://'.length)
              : uri,
          uri: uri,
          statuses: []
        }

        result.devices[uri] = device
      }

      return device
    },
    analizeStatus(status, prefs) {
      let battery = status.uploader.battery
      let voltage = status.uploader.batteryVoltage
      let voltageDisplay

      if (voltage) {
        if (voltage > 1000) {
          voltage = voltage / 1000
        }
        voltageDisplay = voltage.toFixed(3) + 'v'
      }

      if (battery || voltage) {
        status.uploader.value = battery || voltage

        if (battery) {
          status.uploader.battery = battery
        }

        if (voltage) {
          status.uploader.voltage = voltage
          status.uploader.voltageDisplay = voltageDisplay
        }

        status.uploader.display = battery ? `${battery}%` : voltageDisplay

        if (battery >= 95) {
          status.uploader.level = 100
        } else if (battery < 95 && battery >= 55) {
          status.uploader.level = 75
        } else if (battery < 55 && battery >= 30) {
          status.uploader.level = 50
        } else {
          status.uploader.level = 25
        }

        if (battery <= prefs.warn && battery > prefs.urgent) {
          status.uploader.notification = LevelsHelper.levels.WARN
        } else if (battery <= prefs.urgent) {
          status.uploader.notification = LevelsHelper.level.URGENT
        }
      }
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

<style></style>
