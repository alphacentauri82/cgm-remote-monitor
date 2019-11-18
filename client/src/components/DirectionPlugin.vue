<template>
  <v-tooltip top open-on-click v-if="!hide">
    <template v-slot:activator="{ on }">
      <span class="pa-2" v-if="!hide" v-on="on">
        <v-icon large :color="color">{{ directionIcon }}</v-icon>
      </span>
    </template>

    <span>{{ direction }}</span>
  </v-tooltip>
</template>

<script>
import { mapState } from 'vuex'
import DataService from '@/services/DataService.js'

export default {
  name: 'DirectionPlugin',
  props: {
    color: {
      required: false,
      type: String
    }
  },
  data() {
    return {
      hide: false,
      direction: '',
      directionIcon: 'mdi-minus'
    }
  },
  created() {
    this.dir2Icon = {
      NONE: 'mdi-arrow-split-vertical',
      SingleUp: 'mdi-arrow-up',
      DoubleUp: 'mdi-arrow-up-bold-outline',
      TripeUp: 'mdi-arrow-up-bold',
      FortyFiveUp: 'mdi-arrow-top-right',
      Flat: 'mdi-arrow-right',
      FortyFiveDown: 'mdi-arrow-bottom-right',
      SingleDown: 'mdi-arrow-down',
      DoubleDown: 'mdi-arrow-down-bold-outline',
      TripleDown: 'mdi-arrow-down-bold',
      'NOT COMPUTABLE': 'mdi-minus',
      'RATE OUT OF RANGE': 'mdi-arrow-up-down-bold',
      'CGM ERROR': 'mdi-close-outline'
    }
  },
  computed: {
    ...mapState({
      lastUpdated: state => state.data.lastUpdated,
      dataSource: state => state.data
    })
  },
  methods: {
    updateVisualisation() {
      // chose if icon has to be hidden
      if (
        this.dataSource.inRetroMode &&
        !DataService.isCurrent(this.$store.getters['data/lastSGVEntry'])
      ) {
        this.hide = true
      }

      let sgv = this.$store.getters['data/lastSGVEntry']
      if (sgv) {
        this.direction = sgv.direction

        if (this.$store.getters['data/lastSGVMgdl'] < 39) {
          this.directionIcon = this.dir2Icon['CGM ERROR']
          this.direction += ' | CGM ERROR'
        } else {
          this.directionIcon = this.dir2Icon[this.direction] || 'mdi-minus'
        }
      } else {
        this.directionIcon = 'mdi-minus'
        this.direction = 'NOT COMPUTABLE'
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
