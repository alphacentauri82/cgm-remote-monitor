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
import { findLast, each, isEmpty } from 'lodash'
const moment = require('moment')
import DataService from '@/services/DataService.js'
import ProfileService from '@/services/ProfileService.js'

export default {
  name: 'BwpPlugin',
  data() {
    return {
      bwp: null,
      info: [],
      value: '',
      label: 'BWP'
    }
  },
  computed: {
    ...mapState({
      lastUpdated: state => state.data.lastUpdated,
      settings: state => state.serverSettings.settings,
      dataSource: state => state.data,
      dataIOB: state => state.data.iob,
      initTime: state => state.initTime
    })
  },
  methods: {
    updateVisualisation() {
      this.bwp = this.calc()
      let info = []

      this.info = this.pushInfo(this.bwp, info)

      let value
      if (this.bwp && this.bwp.bolusEstimateDisplay >= 0) {
        value = this.bwp.bolusEstimateDisplay + 'U'
      } else if (this.bwp && this.bwp.bolusEstimateDisplay < 0) {
        value = '< 0U'
      }

      this.value = value
    },
    calc() {
      let results = {
        effect: 0,
        outcome: 0,
        bolusEstimate: 0.0
      }
      let scaled = this.$store.getters['data/lastScaledSGV']

      results.scaledSGV = scaled

      let errors = this.checkMissingInfo()

      if (errors && errors.length > 0) {
        results.errors = errors
        return results
      }

      // let profile = this.dataSource.profile
      let iob = (results.iob = this.dataIOB || 0)

      results.effect = iob.iob * ProfileService.getSensitivity(this.initTime)
      results.outcome = scaled - results.effect
      let delta = 0

      let recentCarbs = findLast(this.dataSource.treatments, treatment => {
        return (
          treatment.mills <= this.initTime &&
          this.initTime - treatment.mills <
            moment.duration(60, 'minutes').asMilliseconds() &&
          treatment.carbs > 0
        )
      })

      results.recentCarbs = recentCarbs

      let target_high = ProfileService.getHighBGTarget(this.initTime)
      let sens = ProfileService.getSensitivity(this.initTime)

      if (results.outcome > target_high) {
        delta = results.outcome - target_high
        results.bolusEstimate = delta / sens
        results.aimTarget = target_high
        results.aimTargetString = 'above hight'
      }

      let target_low = ProfileService.getLowBGTarget(this.initTime)
      results.belowLowTarget = false

      if (scaled < target_low) {
        results.belowLowTarget = true
      }

      if (results.outcome < target_low) {
        delta = Math.abs(results.outcome - target_low)
        results.bolusEstimate = (delta / sens) * -1
        results.aimTarget = target_low
        results.aimTargetString = 'below low'
      }

      if (
        results.bolusEstimate !== 0 &&
        ProfileService.getBasal(this.initTime)
      ) {
        // basal profile exists, calculat % change
        let basal = ProfileService.getBasal(this.initTime)
        let thirdMinAdjustment = Math.round(
          ((basal / 2 + results.bolusEstimate) / (basal / 2)) * 100
        )
        let oneHourAdjustment = Math.round(
          ((basal + results.bolusEstimate) / basal) * 100
        )

        results.tempBasalAdjustment = {
          thirtymin: thirdMinAdjustment,
          onehour: oneHourAdjustment
        }
      }

      results.bolusEstimateDisplay = DataService.roundInsulinForDisplayFormat(
        results.bolusEstimate
      )
      results.outcomeDisplay = DataService.roundBGToDisplayFormat(
        results.outcome
      )
      results.displayIOB = DataService.roundInsulinForDisplayFormat(results.iob)
      results.effectDisplay = DataService.roundBGToDisplayFormat(results.effect)
      results.displayLine = `BWP: ${results.bolusEstimateDisplay}U`

      return results
    },
    checkMissingInfo() {
      let errors = []

      if (!this.dataSource.profile || !ProfileService.hasData()) {
        errors.push('Missing need a treatment profile')
      } else if (ProfileService.profileFieldsMissing()) {
        errors.push(
          'Missing sens, target_high, or target_low treatment profile fields'
        )
      }

      if (isEmpty(this.dataIOB)) {
        errors.push('Missing IOB property')
      }

      if (!this.isSGVOk()) {
        errors.push(`Data isn't current`)
      }

      return errors
    },
    isSGVOk() {
      const lastSGVEntry = this.$store.getters['data/lastSGVEntry']
      return (
        lastSGVEntry &&
        lastSGVEntry.mgdl >= 39 &&
        DataService.isCurrent(lastSGVEntry)
      )
    },
    pushInfo(prop, info) {
      if (prop && prop.errors) {
        info.push({
          label: 'Notice',
          value: 'required info missing'
        })
        each(prop.errors, error => {
          info.push({ label: '  • ', value: error })
        })
      } else if (prop) {
        // TODO: Add translations
        info.push({ label: 'Insuling on Board', value: prop.displayIOB + 'U' })
        info.push({
          label: 'Current target',
          value: `Low: ${ProfileService.getLowBGTarget(
            this.initTime
          )} High: ${ProfileService.getHighBGTarget(this.initTime)}`
        })
        info.push({
          label: 'Sensitivity',
          value: `-${ProfileService.getSensitivity(this.initTime)} ${
            this.settings.units
          }/U`
        })
        info.push({
          label: 'Expected effect',
          value: `${prop.displayIOB} x -${ProfileService.getSensitivity(
            this.initTime
          )} = - ${prop.effectDisplay} ${this.settings.units}`
        })
        info.push({
          label: 'Expected outcome',
          value: `${this.$store.getters['data/lastScaledSGV']}-${
            prop.effectDisplay
          } = ${prop.outcomeDisplay} ${this.settings.units}`
        })

        if (prop.bolusEstimateDisplay < 0) {
          info.unshift({ label: '---------', value: '' })
          let carbEquivalent = Math.ceil(
            Math.abs(ProfileService.getCarbRatio() * prop.bolusEstimateDisplay)
          )
          info.unshift({
            label: 'Carb Equivalent',
            value: `${
              prop.bolusEstimateDisplay
            }U * ${ProfileService.getCarbRatio()} = ${carbEquivalent}g`
          })
          info.unshift({
            label: 'Current Carb Ratio',
            value: `1U / ${ProfileService.getCarbRatio()} g`
          })

          if (prop.recentCarbs) {
            info.unshift({
              label: 'Last Carbs',
              value: `${prop.recentCarbs.carbs}g @ ${new Date(
                prop.recentCarbs.mills
              ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            })
          }

          if (!prop.belowLowTarget) {
            info.unshift({
              label: '-BWP',
              value: `'Excess insulin equivalent ${prop.bolusEstimateDisplay}U more than needed to reach low target, not accounting for carbs'`
            })
          }

          if (prop.belowLowTarget) {
            if (prop.iob > 0) {
              info.unshift({
                label: '-BWP',
                value: `Excess insulin equivalent ${prop.bolusEstimateDisplay}U more than needed to reach low target, MAKE SURE IOB IS COVERED BY CARBS`
              })
            } else {
              info.unshift({
                label: '-BWP',
                value: `${prop.bolusEstimateDisplay}U reduction needed in active insulin to reach low target, too much basal?`
              })
            }
          }
        }
      } else {
        info.push({ label: 'Notice', value: 'required info missing' })
      }

      return this.pushTempBasalAdjustments(prop, info)
    },
    pushTempBasalAdjustments(prop, info) {
      if (prop && prop.tempBasalAdjustment) {
        let carbsOrBolusMessage = 'basal adjustment out of range, give carbs?' // TODO: translate
        let sign = ''

        if (prop.tempBasalAdjustment.thirtymin > 100) {
          carbsOrBolusMessage = 'basal adjustment out of range, give bolus?' // TODO: translate
          sign = '+'
        }

        info.push({ label: '---------', value: '' })
        if (prop.aimTarget) {
          info.push({
            label: `Projected BG ${prop.aimTarget} taret`,
            value: `aiming at ${prop.aimTarget} ${this.settings.units}`
          })
        }

        if (prop.bolusEstimate > 0) {
          info.push({
            label: `Bolus ${prop.bolusEstimateDisplay} units`,
            value: 'or adjust basal'
          })
          info.push({
            label: 'Check BG using glucometer before correcting!',
            value: ''
          })
          info.push({ label: '---------', value: '' })
        } else {
          info.push({
            label: `Basal reduction to account ${prop.bolusEstimateDisplay} units`,
            value: ''
          })
        }

        info.push({
          label: 'Current basal',
          value: ProfileService.getBasal(this.initTime)
        })

        if (
          prop.tempBasalAdjustment.thirtymin >= 0 &&
          prop.tempBasalAdjustment.thirtymin <= 200
        ) {
          info.push({
            label: '30m temp basal',
            value: `${prop.tempBasalAdjustment.thirtymin}% (${sign}${prop
              .tempBasalAdjustment.thirtymin - 100}%)`
          })
        } else {
          info.push({
            label: '30m temp basal',
            value: carbsOrBolusMessage
          })
        }

        if (
          prop.tempBasalAdjustment.onehour >= 0 &&
          prop.tempBasalAdjustment.onehour <= 200
        ) {
          info.push({
            label: '1h temp basal',
            value: `${prop.tempBasalAdjustment.onehour}% (${sign}${prop
              .tempBasalAdjustment.onehour - 100}%)`
          })
        } else {
          info.push({
            label: '1h temp basal',
            value: carbsOrBolusMessage
          })
        }
      }

      return info
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
