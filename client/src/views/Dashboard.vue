<template>
  <v-container fluid grid-list-md>
    <v-layout row fill-height justify-center>
      <v-flex md6 lg6 xs12>
        <ClockCurrent />
      </v-flex>

      <v-flex md6 lg6 xs12>
        <v-card>
          <v-card-text>
            <BgStatus />
          </v-card-text>
        </v-card>
      </v-flex>

      <v-flex md12 lg12 xs12>
        <v-card>
          <v-card-text>
            <h2>Chart</h2>
          </v-card-text>
        </v-card>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import ClockCurrent from '@/components/ClockCurrent.vue'
import BgStatus from '@/components/BgStatus.vue'

export default {
  name: 'Dashboard',
  components: {
    ClockCurrent,
    BgStatus
  }
}
</script>
