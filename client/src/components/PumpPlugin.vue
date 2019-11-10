<template>
  <v-tooltip top open-on-click>
    <template v-slot:activator="{ on }">
      <v-chip :color="stateColor" text-color="white" v-on="on">
        <v-avatar class="grey darken-3" left :color="stateColor">
          {{ label }}
        </v-avatar>
        {{ value }}
      </v-chip>
    </template>

    <span>
      <div class="tooltip-info" v-for="(inf, index) in info" :key="index">
        <strong>{{ inf.label }}</strong>
        {{ inf.value }}
      </div>
    </span>
  </v-tooltip>
</template>

<script>
import { mapState } from 'vuex'
import _isEmpty from 'lodash/isEmpty'
import filter from 'lodash/filter'
import forEach from 'lodash/forEach'
import indexOf from 'lodash/indexOf'
import forOwn from 'lodash/forOwn'
import DataService from '@/services/DataService.js'
import LevelsHelper from '@/utils/levels.helper.js'
import DateTimeHelper from '@/utils/datetime.helper.js'
const moment = require('moment')
const ALL_STATUS_FIELDS = ['reservoir', 'battery', 'clock', 'status', 'device']

const isEmpty = list => {
  return _isEmpty(list) || _isEmpty(list[0])
}
const cleanList = value => {
  return decodeURIComponent(value || '')
    .toLowerCase()
    .split(' ')
}

export default {
  name: 'PumpPlugin',
  data() {
    return {
      value: '',
      info: [],
      label: '',
      status: 'current',
      pumpStatus: null
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
      this.updatePumpStatus()

      const prefs = this.getPrefs()
      const data = this.pumpStatus.data
      let values = []
      let info = []

      let selectedFields = this.dataSource.inRetroMode
        ? prefs.retroFields
        : prefs.fields

      if (data) {
        forEach(ALL_STATUS_FIELDS, fieldName => {
          let field = data[fieldName]
          if (field) {
            let selected = indexOf(selectedFields, field) > -1
            if (selected) {
              values.push(field.display)
            } else {
              info.push({ label: field.label, value: field.display })
            }
          }
        })
      }

      if (data && data.extended) {
        info.push({ label: '------------', value: '' })
        forOwn(data.extended, (value, key) => {
          info.push({ label: key, value: value })
        })
      }

      this.value = values.join(' ')
      this.info = info
      this.label = 'Pump' // TODO: add translate

      if (data && 'level' in data) {
        this.status = LevelsHelper.toStatusClass(data.level)
      }
    },
    updatePumpStatus() {
      const initTime = this.$store.state.initTime
      let prefs = this.getPrefs()
      let recentMills =
        initTime -
        moment.duration(prefs.urgentClock * 2, 'minutes').asMilliseconds()

      let filtered = filter(this.dataSource.devicestatus, status => {
        return (
          'pump' in status &&
          DataService.entryMills(status) <= initTime &&
          DataService.entryMills(status) >= recentMills
        )
      })

      let pumpStatus = null

      forEach(filtered, status => {
        status.clockMills =
          status.pump && status.pump.clock
            ? moment(status.pump.clock).valueOf()
            : status.mills
        if (!pumpStatus || status.clockMills > pumpStatus.clockMills) {
          pumpStatus = status
        }
      })

      pumpStatus = pumpStatus || {}
      this.pumpStatus = {
        ...pumpStatus,
        data: this.prepareData(pumpStatus, prefs)
      }
    },
    prepareData(prop, prefs) {
      let pump = (prop && prop.pump) || {}

      let result = {
        level: LevelsHelper.levels.NONE,
        clock: pump.clock ? { value: moment(pump.clock) } : null,
        reservoir:
          pump.reservoir || pump.reservoir === 0
            ? { value: pump.reservoir }
            : null,
        manufacturer: pump.manufacturer,
        model: pump.model,
        extended: pump.extended || null
      }

      if (result.clock) {
        result = { ...result, ...this.updateClock(prefs, result) }
      }
      if (result.reservoir) {
        result = { ...result, ...this.updateReservoir(prefs, result) }
      }
      result = { ...result, ...this.updateStatus(pump, result) }

      if (pump.battery && pump.battery.percent) {
        result.battery = { value: pump.battery.percent, unit: 'percent' }
        result = { ...result, ...this.updateBattery('%', prefs, result) }
      } else if (pump.battery && pump.battery.voltage) {
        result.battery = { value: pump.battery.voltage, unit: 'volts' }
        result = { ...result, ...this.updateBattery('v', prefs, result) }
      }

      // TODO: translate the label
      result.device = { label: 'Device', display: prop.device }
      result.title = 'Pump Status'
      result.level = LevelsHelper.levels.NONE

      // TODO: A new Pump Offline marker? something generic? Use something new instead of a treatment?
      // eslint-disable-next-line no-constant-condition
      if (false) {
        // TODO: import openamps
      } else {
        forEach(ALL_STATUS_FIELDS, fieldName => {
          let field = result[fieldName]

          if (field && field.level > result.level) {
            result.level = field.level
            result.title = field.message
          }
        })
      }

      result = { ...result, ...this.buildMessage(result) }

      return result
    },
    getPrefs() {
      const extendedSettings = this.serverSettings.extendedSettings['pump']
      let fields = extendedSettings ? cleanList(extendedSettings.fields) : []
      fields = isEmpty(fields) ? ['reservoir'] : fields

      let retroFields = extendedSettings
        ? cleanList(extendedSettings.retroFields)
        : []
      retroFields = isEmpty(retroFields)
        ? ['reservoir', 'battery']
        : retroFields

      return {
        fields,
        retroFields,
        warnClock: (extendedSettings && extendedSettings.warnClock) || 30,
        urgentClock: (extendedSettings && extendedSettings.urgentClock) || 60,
        warnRes: (extendedSettings && extendedSettings.warnRes) || 10,
        urgentRes: (extendedSettings && extendedSettings.urgentRes) || 5,
        warnBattV: (extendedSettings && extendedSettings.warnBattV) || 1.35,
        urgentBattV: (extendedSettings && extendedSettings.urgentBattV) || 1.3,
        warnBattP: (extendedSettings && extendedSettings.warnBattP) || 30,
        urgentBattP: (extendedSettings && extendedSettings.urgentBattP) || 20,
        warnOnSuspend:
          (extendedSettings && extendedSettings.warnOnSuspend) || false,
        enableAlerts:
          (extendedSettings && extendedSettings.enableAlerts) || false
      }
    },
    updateClock(prefs, result) {
      const initTime = this.$store.state.initTime

      if (result.clock) {
        result.clock.label = 'Last Clock'
        result.clock.display = DateTimeHelper.formatPumpTime(
          result.clock.value,
          this.dataSource.inRetroMode,
          initTime
        )
      }

      let urgent = moment(initTime).subtract(prefs.urgentClock, 'minutes')
      let warn = moment(initTime).subtract(prefs.warnClock, 'minutes')

      if (result.clock && urgent.isAfter(result.clock.value)) {
        result.clock.level = LevelsHelper.levels.URGENT
        result.clock.message = 'URGENT: Pump data stale'
      } else if (result.clock && warn.isAfter(result.clock.value)) {
        result.clock.level = LevelsHelper.levels.WARN
        result.clock.message = 'Warning, Pump data stale'
      } else {
        result.clock.level = LevelsHelper.levels.NONE
      }

      return result
    },
    updateReservoir(prefs, result) {
      if (result.reservoir) {
        result.reservoir.label = 'Reservoir'
        result.reservoir.display = result.reservoir.value.toPrecision(3) + 'U'

        if (result.reservoir.value < prefs.urgentRes) {
          result.reservoir.level = LevelsHelper.levels.URGENT
          result.reservoir.message = 'URGENT: Pump Reservoir Low'
        } else if (result.reservoir.value < prefs.warnRes) {
          result.reservoir.level = LevelsHelper.levels.WARN
          result.reservoir.message = 'Warning, Pump Reservoir Low'
        } else {
          result.reservoir.level = LevelsHelper.levels.NONE
        }
      } else if (result.manufacturer === 'Insulet' && result.model === 'Eros') {
        result.reservoir = {
          label: 'Reservoir',
          display: '50+ U'
        }
      }

      return result
    },
    updateStatus(pump, result) {
      if ('status' in pump && pump.status) {
        let status = pump.status.status || 'normal'

        if (pump.status.bolusing) {
          status = 'bolusing'
        } else if (pump.status.suspended) {
          status = 'suspended'
          if (pump.warnOnSuspend && pump.status.suspended) {
            result.status.level = LevelsHelper.levels.WARN
            result.status.message = 'Pump Suspended'
          }
        }
        result.status = {
          value: status,
          display: status,
          label: 'Status' // TODO: add translate
        }
      }

      return result
    },
    updateBattery(type, prefs, result) {
      if ('battery' in result && result.battery) {
        result.battery.label = 'Battery'
        result.battery.display = result.battery.value + type
        let urgent = type === 'v' ? prefs.urgentBattV : prefs.urgentBattP
        let warn = type === 'v' ? prefs.warnBattV : prefs.warnBattP

        if (result.battery.value < urgent) {
          result.battery.level = LevelsHelper.levels.URGENT
          result.battery.message = 'URGENT: Pump Battery Low'
        } else if (result.battery.value < warn) {
          result.battery.level = LevelsHelper.level.WARN
          result.battery.message = 'Warning, Pump Battery Low'
        } else {
          result.battery.level = LevelsHelper.levels.NONE
        }
      }

      return result
    },
    buildMessage(result) {
      if (result.level > LevelsHelper.levels.NONE) {
        let message = []

        if (result.battery) {
          message.push('Pump Battery: ' + result.battery.display)
        }

        if (result.reservoir) {
          message.push('Pump Reservoir: ' + result.reservoir.display)
        }

        result.message = message.join('\n')
      }

      return result
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
  width: 50px !important;
  height: 25px !important;
  border-radius: 20%;
}
/* .tooltip-info {
  display: inline-block;
} */
</style>
