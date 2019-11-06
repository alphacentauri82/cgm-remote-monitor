<template>
  <v-chip :color="stateColor" text-color="white">
    <v-avatar left :color="stateColor" v-if="!inRetroMode">{{
      timeDisplay
    }}</v-avatar>
    <template v-if="!inRetroMode">{{ label }}</template>
    <template v-else
      >RETRO</template
    >
  </v-chip>
</template>

<script>
import { mapState } from 'vuex'
const moment = require('moment')

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
  created() {
    const oneMinute = moment.duration(1, 'minutes').asMilliseconds()
    const twoMinutes = moment.duration(2, 'minutes').asMilliseconds()
    const oneHour = moment.duration(1, 'hour').asMilliseconds()
    const twoHours = moment.duration(2, 'hours').asMilliseconds()
    const oneDay = moment.duration(1, 'day').asMilliseconds()
    const twoDays = moment.duration(2, 'days').asMilliseconds()
    const oneWeek = moment.duration(1, 'week').asMilliseconds()

    this.resolvers = [
      this.isMissing,
      this.inTheFuture,
      this.almostInTheFuture,
      this.isLessThan(twoMinutes, oneMinute, 'min ago', 'm'),
      this.isLessThan(oneHour, oneMinute, 'mins ago', 'm'),
      this.isLessThan(twoHours, oneHour, 'hour ago', 'h'),
      this.isLessThan(oneDay, oneHour, 'hours ago', 'h'),
      this.isLessThan(twoDays, oneDay, 'day ago', 'd'),
      this.isLessThan(oneWeek, oneDay, 'days ago', 'd'),
      function() {
        return {
          label: 'long ago',
          shortLabel: 'ago'
        }
      }
    ]
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
      let agoDisplay = this.calcDisplay(
        this.$store.getters['data/lastSGVEntry'],
        this.$store.state.initTime
      )
      this.label = agoDisplay.label
      this.shortLabel = agoDisplay.shortLabel
      this.timeDisplay = agoDisplay.value

      this.checkStatus()
    },
    calcDisplay(entry, time) {
      const opts = {
        time: time,
        entry: entry
      }

      if (time && entry && entry.mills) {
        opts.timeSince = time - entry.mills
      }

      for (let i = 0; i < this.resolvers.length; i++) {
        let value = this.resolvers[i](opts)
        if (value) {
          return value
        }
      }
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
    },
    isMissing(opts) {
      if (
        !opts ||
        !opts.entry ||
        isNaN(opts.entry.mills) ||
        isNaN(opts.time) ||
        isNaN(opts.timeSince)
      ) {
        // TODO: add translate features
        return {
          label: 'time ago',
          shortLabel: 'ago'
        }
      }
    },
    inTheFuture(opts) {
      if (
        opts.entry.mills - moment.duration(5, 'minutes').milliseconds() >
        opts.time
      ) {
        // TODO: add translations
        return {
          label: 'in the future',
          shortLabel: 'future'
        }
      }
    },
    almostInTheFuture(opts) {
      if (opts.entry.mills > opts.time) {
        return {
          value: 1,
          label: 'min ago',
          shortLabel: 'm'
        }
      }
    },
    isLessThan(limit, divisor, label, shortLabel) {
      return function checkIsLessThan(opts) {
        if (opts.timeSince < limit) {
          return {
            value: Math.max(1, Math.round(opts.timeSince / divisor)),
            label: label,
            shortLabel: shortLabel
          }
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
