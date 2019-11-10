<template>
  <v-chip :color="stateColor" text-color="white">
    <v-avatar left :color="stateColor" v-if="!inRetroMode">
      {{ timeDisplay }}
    </v-avatar>
    <template v-if="!inRetroMode">{{ label }}</template>
    <template v-else
      >RETRO</template
    >
  </v-chip>
</template>

<script>
import { mapState } from 'vuex'
const moment = require('moment')
import DateTimeHelper from '@/utils/datetime.helper.js'

export default {
  name: 'TimeAgoPlugin',
  data() {
    return {
      lastChecked: new Date(),
      lastSuspendTime: new Date('1900-01-01'),
      label: '',
      shortLabel: '',
      timeDisplay: 0,
      status: 'current'
    }
  },
  computed: {
    stateColor() {
      let color
      switch (this.status) {
        case 'urgent':
          color = 'red'
          break
        case 'warn':
          color = 'yellow'
          break
        default:
          color = 'primary'
          break
      }

      return color
    },
    ...mapState({
      lastUpdated: state => state.data.lastUpdated,
      inRetroMode: state => state.data.inRetroMode
    })
  },
  methods: {
    updateVisualisation() {
      let agoDisplay = DateTimeHelper.calcDisplay(
        this.$store.getters['data/lastSGVEntry'],
        this.$store.state.initTime
      )
      this.label = agoDisplay.label
      this.shortLabel = agoDisplay.shortLabel
      this.timeDisplay = agoDisplay.value

      this.checkStatus()
    },
    checkStatus() {
      // check if the app has been suspended, if yes, snooze data missing alarm for 15 seconds
      let now = new Date()
      let delta = now.getTime() - this.lastChecked.getTime()
      this.lastChecked = now

      if (delta > 15 * 1000) {
        // looks like we've been hibernating
        this.lastSuspendTime = now
      }

      let timeSinceLastSuspended =
        now.getTime() - this.lastSuspendTime.getTime()

      if (timeSinceLastSuspended < 10 * 1000) {
        console.log('Hibernation detected, suspending timeago alarm')
        this.status = 'current'
        return false
      }

      let lastSGVEntry = this.$store.getters['data/lastSGVEntry']
      let warn = this.$store.state.serverSettings.settings.alarmTimeagoWarn
      let warnMins =
        this.$store.state.serverSettings.settings.alarmTimeagoWarnMins || 15
      let urgent = this.$store.state.serverSettings.settings.alarmTimeagoUrgent
      let urgentMins =
        this.$store.state.serverSettings.settings.alarmTimeagoUrgentMins || 30

      const isStale = mins => {
        return (
          this.$store.state.initTime - lastSGVEntry.mills >
          moment.duration(mins, 'minutes').asMilliseconds()
        )
      }

      if (!lastSGVEntry) {
        this.status = 'current'
      } else if (urgent && isStale(urgentMins)) {
        this.status = 'urgent'
      } else if (warn && isStale(warnMins)) {
        this.status = 'warn'
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
