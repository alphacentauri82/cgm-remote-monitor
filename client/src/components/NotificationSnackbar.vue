<template>
  <!-- Snackbar with the message of the notification -->
  <v-snackbar v-model="open" :color="color" :timeout="0">
    {{ notification.message }}
    <v-btn dark text @click="open = false">Close</v-btn>
  </v-snackbar>
</template>

<script>
import { mapActions } from 'vuex'

export default {
  props: {
    // notification object from parent component
    notification: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      timeout: null,
      destroyTime: 8000,
      open: true
    }
  },
  mounted() {
    this.timeout = setTimeout(
      () => this.remove(this.notification.id),
      this.destroyTime
    )
  },
  beforeDestroy() {
    clearTimeout(this.timeout)
  },
  computed: {
    // @vuese
    // gets the type of notification as color for the snackbar
    color() {
      return this.notification.type || 'info'
    }
  },
  methods: mapActions('notification', ['remove'])
}
</script>

<style></style>
