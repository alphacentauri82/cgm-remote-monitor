<template>
  <!-- Container to display all the Snackbar of notifications -->
  <div class="notification-container">
    <NotificationSnackbar
      v-for="notification in notifications"
      :key="notification.id"
      :notification="notification"
    />
  </div>
</template>

<script>
import NotificationSnackbar from '@/components/NotificationSnackbar.vue'
import { mapState } from 'vuex'

// This method displays all the snackbar of notifications
export default {
  components: {
    NotificationSnackbar
  },
  computed: mapState('notification', ['notifications'])
}
</script>

<style></style>
