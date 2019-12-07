<template>
  <v-chip :color="stateColor" text-color="white">
    <v-avatar left :color="stateColor" v-if="!inRetroMode">{{ timeDisplay }}</v-avatar>
    <template v-if="!inRetroMode">{{ label }}</template>
    <template v-else>
      <span>RETRO</span>
    </template>
  </v-chip>
</template>

<script>
import { mapState } from 'vuex'
import DateTimeHelper from '@/utils/datetime.helper.js'
import DataService from '@/services/DataService.js'

export default {
  name: 'TimeAgoPlugin',
  data() {
    return {
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
          color = 'default'
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

      this.status = DataService.checkCurrentStatus()
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
