<template>
  <v-card elevation="0">
    <v-card-text>
      <div class="statusBox">
        <div
          class="bg-wrapper d-flex align-center justify-center"
          :class="stateColor"
        >
          <p class="currentBg">{{ currentBgDisplay }}</p>
          <DirectionPlugin :color="stateColor" />
        </div>
        <v-chip-group multiple column>
          <BgNowPlugin />
          <IobPlugin />
          <BwpPlugin />
          <CannulaAgePlugin v-if="this.isFeatureEnabled('cage')" />
          <SensorAgePlugin v-if="this.isFeatureEnabled('sage')" />
        </v-chip-group>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import { mapState } from 'vuex'
import { last, isNumber } from 'lodash'
// import DataService from '@/services/DataService.js'
import errorCodes from '@/utils/errorCodes.helper.js'
import DirectionPlugin from '@/components/DirectionPlugin.vue'
import BgNowPlugin from '@/components/BgNowPlugin.vue'
import IobPlugin from '@/components/IobPlugin.vue'
import BwpPlugin from '@/components/BwpPlugin.vue'
import CannulaAgePlugin from '@/components/CannulaAgePlugin.vue'
import SensorAgePlugin from '@/components/SensorAgePlugin.vue'

export default {
  name: 'BgStatus',
  components: {
    DirectionPlugin,
    BgNowPlugin,
    IobPlugin,
    BwpPlugin,
    CannulaAgePlugin,
    SensorAgePlugin
  },
  data() {
    return {
      currentBg: '--',
      status: 'current'
    }
  },
  computed: {
    errorCodeToDisplay(value) {
      return errorCodes.toDisplay(value)
    },
    currentBgDisplay() {
      if (!isNumber(this.currentBg)) {
        return '--'
      }

      if (this.currentBg === 9) {
        return ''
      } else if (this.currentBg < 39) {
        return errorCodes.toDisplay(this.currentBg)
      } else if (this.currentBg < 40) {
        return 'LOW'
      } else if (this.currentBg > 400) {
        return 'HIGH'
      } else {
        return this.scaleBg(this.currentBg)
      }
    },
    stateColor() {
      let color
      switch (this.status) {
        case 'urgent':
          color = 'red--text'
          break
        case 'warning':
          color = 'yellow--text'
          break
        default:
          color = 'light-green--text  text--accent-3'
          break
      }

      return color
    },
    ...mapState({
      lastUpdated: state => state.data.lastUpdated,
      settings: state => state.serverSettings.settings,
      dataSource: state => state.data
    })
  },
  methods: {
    isFeatureEnabled(feature) {
      return this.$store.getters.isFeatureEnabled(feature)
    },
    updateVisualisation() {
      let currentData = this.dataSource.entries.filter(d => {
        // TODO: add comparison referent to `d.mills <= brushExtent[1].getTime()`
        return d.type == 'sgv'
      })

      let focusPoint = last(currentData)
      this.currentBg =
        focusPoint && 'mgdl' in focusPoint ? focusPoint.mgdl : '--'
      this.sgvToColoredRange()

      // TODO: whatever logic for inRetroMode
    },
    scaleBg() {
      let bg = this.currentBg
      if (this.settings.units === 'mmol') {
        return (Math.round((bg / 18) * 10) / 10).toFixed(1)
      }

      return bg
    },
    sgvToColoredRange() {
      if (!this.settings || !this.settings.thresholds) {
        return
      }

      if (this.currentBg > this.settings.thresholds.bgHigh) {
        this.status = 'urgent'
      } else if (this.currentBg > this.settings.thresholds.bgTargetTop) {
        this.status = 'warning'
      } else if (
        this.currentBg >= this.settings.thresholds.bgTargetBottom &&
        this.currentBg <= this.settings.thresholds.bgTargetTop &&
        this.settings.theme === 'colors'
      ) {
        this.status = 'inrange'
      } else if (this.currentBg < this.settings.thresholds.bgLow) {
        this.status = 'urgent'
      } else if (this.currentBg < this.settings.thresholds.bgTargetBottom) {
        this.status = 'warning'
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

<style scoped>
.statusBox .bg-wrapper {
  height: 100px;
}
.statusBox .currentBg {
  font-size: 90px;
}
</style>
