<template>
  <v-card>
    <v-card-text>
      <div class="statusBox">
        <div class="time-wrapper d-flex align-center justify-center">
          <p class="currentTime text--primary">{{ currentTimeFormatted }}</p>
        </div>
        <v-chip-group multiple column>
          <TimeAgoPlugin v-if="this.isFeatureEnabled('timeago')" />
          <UBatPlugin v-if="this.isFeatureEnabled('upbat')" />
          <PumpPlugin v-if="this.isFeatureEnabled('pump')" />
          <OpenApsPlugin v-if="this.isFeatureEnabled('openaps')" />
        </v-chip-group>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import { mapState } from 'vuex'
import dateTimeHelper from '@/utils/datetime.helper.js'
import TimeAgoPlugin from '@/components/TimeAgoPlugin.vue'
import UBatPlugin from '@/components/UBatPlugin.vue'
import PumpPlugin from '@/components/PumpPlugin.vue'
import OpenApsPlugin from '@/components/OpenApsPlugin.vue'

export default {
  name: 'ClockCurrent',
  components: {
    TimeAgoPlugin,
    UBatPlugin,
    PumpPlugin,
    OpenApsPlugin
  },
  data: () => {
    return {
      updateInterval: null
    }
  },
  created() {
    // update the clock with an interval of 60 seconds
    this.updateClock()
  },
  beforeDestroy() {
    // cleaning up memory when this component is destroyed
    clearTimeout(this.updateInterval)
  },
  computed: {
    currentTimeFormatted() {
      if (this.currentTime) {
        return dateTimeHelper.formatTime(this.currentTime, true)
      }
      return '--'
    },
    ...mapState({
      currentTime: state => state.currentTime
    })
  },
  methods: {
    updateClock() {
      this.$store.dispatch('updateCurrentTime')

      this.updateInterval = setTimeout(
        this.updateClock,
        (60 - new Date().getSeconds()) * 1000 + 5
      )
    },
    isFeatureEnabled(feature) {
      return this.$store.getters.isFeatureEnabled(feature)
    },
    // TODO: research and develop this function
    updateTimeAgo() {
      // this function is related to the first pill that shows
      // how many time ago dat has been pulled from server
    }
  }
}
</script>

<style scoped>
.statusBox .time-wrapper {
  height: 100px;
}
.statusBox .currentTime {
  font-size: 100px;
}
</style>
