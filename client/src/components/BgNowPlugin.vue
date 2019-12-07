<template>
  <v-tooltip top open-on-click>
    <template v-slot:activator="{ on }">
      <v-chip text-color="white" v-on="on">
        <v-avatar class="grey darken-3" left>{{ value }}</v-avatar>
        {{ unit }}
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
import {
  times,
  find,
  map,
  filter,
  forEach,
  chain,
  maxBy,
  isEmpty,
  isNumber,
  isObject,
  merge,
  omit,
  keys,
  forIn,
  get,
  takeRightWhile
} from 'lodash'
import moment from 'moment'
import DataService from '@/services/DataService.js'
import DateHelper from '@/utils/datetime.helper.js'

const bucketFields = ['index', 'fromMills', 'toMills']

export default {
  name: 'BgNowPlugin',
  data() {
    return {
      buckets: null,
      recentBucket: null,
      bgnow: null,
      previousBucket: null,
      delta: null,
      info: [],
      unit: '',
      value: ''
    }
  },
  computed: {
    ...mapState({
      lastUpdated: state => state.data.lastUpdated,
      settings: state => state.serverSettings.settings,
      dataSource: state => state.data,
      initTime: state => state.initTime
    })
  },
  methods: {
    updateVisualisation() {
      this.fillBuckets()

      this.recentBucket = this.mostRecentBucket()
      this.bgnow = omit(this.recentBucket, bucketFields)
      this.previousBucket = this.getPreviousBucket()
      this.delta = this.calcDelta()

      let info = []
      let display = get(this.delta, 'display')

      if (get(this.delta, 'interpolated')) {
        display += ' *'
        // TODO: add translation
        info.push({
          label: 'Elapsed Time',
          value: `${Math.round(this.delta.elapsedMins)} mins`
        })
        info.push({
          label: 'Absolute Delta',
          value: `${DataService.roundBGToDisplayFormat(
            DataService.scaleMgdl(this.delta.absolute)
          )} ${DataService.unitsLabel()}`
        })
        info.push({
          label: 'Interpolated',
          value: `${DataService.roundBGToDisplayFormat(
            DataService.scaleMgdl(this.delta.mean5MinsAgo)
          )} ${DataService.unitsLabel()}`
        })
      }

      let deviceInfos = {}

      if (this.bgnow.sgvs) {
        forEach(this.bgnow.sgvs, entry => {
          let device = DataService.getDeviceName(entry.device)
          deviceInfos[device] = {
            time: DateHelper.formatPumpTime(
              moment(entry.mills),
              this.dataSource.inRetroMode,
              this.initTime
            ),
            value: DataService.scaleEntry(entry),
            recent: entry
          }
        })
      }

      if (get(this.delta, 'previous.sgvs')) {
        forEach(this.delta.previous.sgvs, entry => {
          let device = DataService.getDeviceName(entry.device)
          let deviceInfo = deviceInfos[device]
          if (deviceInfo && deviceInfo.recent) {
            let deviceDelta = this.calcDelta(
              { mills: deviceInfo.recent.mills, mean: deviceInfo.recent.mgdl },
              { mills: entry.mills, mean: entry.mgdl }
            )

            if (deviceDelta) {
              deviceInfo.delta = deviceDelta.display
            }
          } else {
            deviceInfos[device] = {
              time: DateHelper.formatPumpTime(
                moment(entry.mills),
                this.dataSource.inRetroMode,
                this.initTime
              ),
              value: DataService.scaleEntry(entry)
            }
          }
        })
      }

      if (keys(deviceInfos).length > 1) {
        forIn(deviceInfos, (deviceInfo, name) => {
          let display = deviceInfo.value
          if (deviceInfo.delta) {
            display += ` ${deviceInfo.delta}`
          }
          display += ` (${deviceInfo.time})`

          info.push({ label: name, value: display })
        })
      }

      this.info = isEmpty(info) ? [] : info
      this.unit = DataService.unitsLabel()
      this.value = display
    },
    fillBuckets() {
      const bucketCount = 4
      const bucketMins = 5
      const offset = moment.duration(2.5, 'minutes').asMilliseconds()
      const bucketMsecs = moment
        .duration(bucketMins, 'minutes')
        .asMilliseconds()

      let lastSGVMills = this.$store.getters['data/lastSGVMills']

      // create the buckets
      let buckets = times(bucketCount, index => {
        let fromMills = lastSGVMills - offset - index * bucketMsecs

        return {
          index,
          fromMills,
          toMills: fromMills + bucketMsecs,
          sgvs: []
        }
      })

      // add data to buckets
      takeRightWhile(this.dataSource.sgvs, sgv => {
        // if in the future, return true and keep taking right
        if (sgv.mills > this.initTime) {
          return true
        }

        let bucket = find(buckets, bucket => {
          return sgv.mills >= bucket.fromMills && sgv.mills <= bucket.toMills
        })

        if (bucket) {
          bucket.sgvs.push(sgv)
        }
        return bucket
      })

      this.buckets = map(buckets, this.analyzeBucket)
    },
    analyzeBucket(bucket) {
      if (isEmpty(bucket.sgvs)) {
        bucket.isEmpty = true
        return bucket
      }

      let details = {}
      let sgvs = filter(bucket.sgvs, this.notError)

      const calcMean = sgvs => {
        let sum = 0
        forEach(sgvs, sgv => {
          sum += Number(sgv.mgdl)
        })

        return sum / sgvs.length
      }

      let mean = calcMean(sgvs)
      if (mean && isNumber(mean)) {
        details.mean = mean
      }

      let mostRecent = maxBy(sgvs, 'mills')
      if (mostRecent) {
        details.last = mostRecent.mgdl
        details.mills = mostRecent.mills
      }

      let errors = filter(bucket.sgvs, this.isError)
      if (!isEmpty(errors)) {
        details.errors = errors
      }

      return merge(details, bucket)
    },
    notError(entry) {
      // TODO maybe lower instead of expecting dexcom?
      return entry && entry.mgdl > 39
    },
    isError(entry) {
      return !entry || !entry.mgdl || entry.mgdl < 39
    },
    mostRecentBucket() {
      // not empty bucket
      return find(this.buckets, bucket => {
        return bucket && !bucket.isEmpty
      })
    },
    getPreviousBucket() {
      let previous = null
      const recent = this.recentBucket

      if (isObject(recent)) {
        previous = chain(this.buckets)
          .find(bucket => {
            return bucket.mills < recent.mills && !bucket.isEmpty
          })
          .value()
      }

      return previous
    },
    calcDelta(recent, previous) {
      recent = recent || this.recentBucket
      previous = previous || this.previousBucket

      if (isEmpty(recent)) {
        console.info('all buckets are empty')
        return null
      }

      if (isEmpty(previous)) {
        console.info('previous bucket not found, not calculating delta')
        return null
      }

      let delta = {
        absolute: recent.mean - previous.mean,
        elapsedMins:
          (recent.mills - previous.mills) /
          moment.duration(1, 'minutes').asMilliseconds()
      }

      delta.interpolated = delta.elapsedMins > 9
      delta.mean5MinsAgo = delta.interpolated
        ? recent.mean - (delta.absolute / delta.elapsedMins) * 5
        : recent.mean - delta.absolute

      delta.mgdl = Math.round(recent.mean - delta.mean5MinsAgo)

      delta.scaled =
        this.settings.units === 'mmol'
          ? DataService.roundBGToDisplayFormat(
              DataService.scaleMgdl(recent.mean) -
                DataService.scaleMgdl(delta.mean5MinsAgo)
            )
          : delta.mgdl
      delta.display = (delta.scaled >= 0 ? '+' : '') + delta.scaled
      delta.previous = omit(previous, bucketFields)

      return delta
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
