<template>
  <v-tooltip top open-on-click>
    <template v-slot:activator="{ on }">
      <v-chip text-color="white" v-on="on">
        <v-avatar class="grey darken-3" left>{{ value }}</v-avatar>
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
import { chain, isEmpty, get, isObject, isArray, each, merge } from 'lodash'
const moment = require('moment')
import DataService from '@/services/DataService.js'
import ProfileService from '@/services/ProfileService.js'

const RECENCY_THRESHOLD = moment.duration(30, 'minutes').asMilliseconds()

export default {
  name: 'IobPlugin',
  data() {
    return {
      iob: null,
      value: '',
      info: [],
      label: []
    }
  },
  computed: {
    ...mapState({
      lastUpdated: state => state.data.lastUpdated,
      settings: state => state.serverSettings,
      dataSource: state => state.data,
      initTime: state => state.initTime
    })
  },
  methods: {
    updateVisualisation() {
      this.calcTotal(
        this.dataSource.treatments,
        this.dataSource.devicestatus,
        this.dataSource.profile,
        this.initTime
      )

      let info = []

      if (this.iob.lastBolus) {
        let when = new Date(this.iob.lastBolus.mills).toLocaleTimeString()
        let amount =
          DataService.roundInsulinForDisplayFormat(
            Number(this.iob.lastBolus.insulin)
          ) + 'U'
        info.push({
          label: 'Last Bolus', // TODO: Add translation
          value: `${amount} @ ${when}`
        })
      }

      if (this.iob.basaliob !== undefined) {
        info.push({
          label: 'Basal IOB', // TODO: Add translation
          value: this.iob.basaliob.toFixed(2)
        })
      }

      if (this.iob.source !== undefined) {
        info.push({
          label: 'Source', // TODO: add translation
          value: this.iob.source
        })
      }

      if (this.iob.device !== undefined) {
        info.push({
          label: 'Device', // TODO: Add translation
          value: this.iob.device
        })
      }

      if (this.iob.treatmentIob !== undefined) {
        info.push({
          label: '------------',
          value: ''
        })
        info.push({
          label: 'Careportal IOB', // TODO: translate
          value: this.iob.treatmentIob.toFixed(2)
        })
      }

      let value =
        (this.iob.display !== undefined
          ? DataService.roundInsulinForDisplayFormat(this.iob.display)
          : '---') + 'U'

      this.value = value
      this.info = info
      this.label = 'IOB' // TODO: add translation
    },
    calcTotal(treatments, devicestatus, profile, time, spec_profile) {
      let result = this.lastIOBDeviceStatus(devicestatus, time)
      let treatmentResult =
        treatments != undefined && treatments.length
          ? this.fromTreatments(treatments, profile, time, spec_profile)
          : {}

      if (isEmpty(result)) {
        result = treatmentResult
      } else if (treatmentResult.iob) {
        result.treatmentIob = +(Math.round(treatmentResult.iob + 'e+3') + 'e-3')
      }

      if (result.iob) {
        result.iob = +(Math.round(result.iob + 'e+3') + 'e-3')
      }

      this.iob = this.addDisplay(result)
      // udate this data on the store
      this.$store.dispatch('data/updateIob', this.iob)
    },
    lastIOBDeviceStatus(devicestatus, time) {
      if (time && time.getTime) {
        time = time.getTime()
      }

      // allow for cloks to be a little off
      let futureMills = time + moment.duration(5, 'minutes').asMilliseconds()
      let recentMills = time - RECENCY_THRESHOLD

      // All IOBs
      let iobs = chain(devicestatus)
        .filter(iobStatus => {
          return (
            iobStatus.mills <= futureMills && iobStatus.mills >= recentMills
          )
        })
        .map(this.fromDeviceStatus)
        .reject(isEmpty)
        .sortBy('mills')

      // loop IOBs
      let loopIOBs = iobs.filter(iobStatus => {
        return iobStatus.source === 'Loop'
      })

      // loop uploads both Loop IOB and pump-reported IOB, prioritize Loop IOB if available
      return loopIOBs.last().value() || iobs.last().value()
    },
    fromDeviceStatus(devicestatusEntry) {
      let iobOpenAPS = get(devicestatusEntry, 'openaps.iob')
      let iobLoop = get(devicestatusEntry, 'loop.iob')
      let iobPump = get(devicestatusEntry, 'pump.iob')

      if (isObject(iobOpenAPS)) {
        // hacks to support AMA iob array with time fields instead of timestamp fields
        iobOpenAPS = isArray(iobOpenAPS) ? iobOpenAPS[0] : iobOpenAPS

        // array could still be empty, handle as null
        if (isEmpty(iobOpenAPS)) {
          return {}
        }

        if (iobOpenAPS.time) {
          iobOpenAPS.timestamp = iobOpenAPS.time
        }

        return {
          iob: iobOpenAPS.iob,
          basaliob: iobOpenAPS.basaliob,
          activity: iobOpenAPS.activity,
          source: 'OpenAPS',
          device: devicestatusEntry.device,
          mills: moment(iobOpenAPS.timestamp).valueOf()
        }
      } else if (isObject(iobLoop)) {
        return {
          iob: iobLoop.iob,
          source: 'Loop',
          device: devicestatusEntry.device,
          mills: moment(iobLoop.timestamp).valueOf()
        }
      } else if (isObject(iobPump)) {
        return {
          iob: iobPump.iob || iobPump.bolusiob,
          source:
            devicestatusEntry.connect !== undefined ? 'MM Connect' : undefined,
          device: devicestatusEntry.device,
          mills: devicestatusEntry.mills
        }
      } else {
        return {}
      }
    },
    fromTreatments(treatments, profile, time, spec_profile) {
      let totalIOB = 0
      let totalActivity = 0
      let lastBolus = null

      each(treatments, treatment => {
        if (treatment.mills <= time) {
          let tIOB = this.calcTreatment(treatment, profile, time, spec_profile)
          if (tIOB.iobContrib > 0) {
            lastBolus = treatment
          }

          if (tIOB && tIOB.ioContrib) {
            totalIOB += tIOB.iobContrib
          }

          // units: BG (mg/dL or mmol/L)
          if (tIOB && tIOB.activityContrib) {
            totalActivity += tIOB.activityContrib
          }
        }
      })

      return {
        iob: +(Math.round(totalIOB + 'e+3') + 'e-3'),
        activity: totalActivity,
        lastBolus,
        source: 'Care Portal' // TODO: translate
      }
    },
    addDisplay(iob) {
      if (isEmpty(iob) || iob.iob === undefined) {
        return {}
      }
      let display = DataService.toFixed(iob.iob)
      return merge(iob, {
        display,
        displayLine: `IOB: ${display} U`
      })
    },
    calcTreatment(treatment, profile, time, spec_profile) {
      let dia = 3
      let sens = 0

      if (profile !== undefined) {
        dia = ProfileService.getDIA(time, spec_profile) || 3
        sens = ProfileService.getSensitivity(time, spec_profile)
      }

      const scaleFactor = 3.0 / dia
      const peak = 75
      let result = {
        ioContrib: 0,
        activityContrib: 0
      }

      if (treatment.insulin) {
        let bolusTime = treatment.mills
        let minAgo = (scaleFactor * (time - bolusTime)) / 1000 / 60

        if (minAgo < peak) {
          let x1 = minAgo / 5 + 1
          result.ioContrib =
            treatment.insulin * (1 - 0.001852 * x1 * x1 + 0.001852 * x1)
          // units: BG (mg/dL) = (BG/U) * U insulin * scalar
          result.activityContrib =
            sens * treatment.insulin * (2 / dia / 60 / peak) * minAgo
        } else if (minAgo < 180) {
          let x2 = (minAgo - 75) / 5
          result.ioContrib =
            treatment.insulin * (0.001323 * x2 * x2 - 0.054233 * x2 + 0.55556)
          result.activityContrib =
            sens *
            treatment.insulin *
            (2 / dia / 60 - ((minAgo - peak) * 2) / dia / 60 / (60 * 3 - peak))
        }
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
  border-radius: 25%;
  height: 26px !important;
  padding: 0 7px;
  width: auto !important;
}
</style>
