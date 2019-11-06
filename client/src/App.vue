<template>
  <v-app>
    <BaseNavbar @showSidebar="enablesidebar = !enablesidebar" />
    <BaseSidebar
      v-bind:drawer="enablesidebar"
      @displaySettings="enablesettings = !enablesettings"
    />
    <BaseDashboardSettings
      v-bind:opened="enablesettings"
      @updset="enablesettings = !enablesettings"
    />

    <NotificationContainer />
    <v-content>
      <router-view :key="$route.fullPath"></router-view>
    </v-content>

    <v-footer padless>
      <v-col class="text-center white--text" cols="12">
        Copyright © 2017
        <a
          href="https://github.com/nightscout/cgm-remote-monitor/graphs/contributors"
          target="_blank"
          >Nightscout contributors</a
        >
      </v-col>
    </v-footer>
  </v-app>
</template>

<script>
import { mapActions, mapState } from 'vuex'
import NotificationContainer from '@/components/NotificationContainer.vue'

export default {
  name: 'App',
  components: {
    NotificationContainer
  },
  data: () => ({
    enablesidebar: false,
    enablesettings: false
  }),
  sockets: {
    connect: function() {
      console.log('Client connected to server.')
      // emit socket authorize
      this.$socket.emit(
        'authorize',
        {
          client: 'web',
          secret:
            this.auth.authorized && this.auth.autorized.token
              ? null
              : this.auth.apiSecretHash,
          token: this.auth.authorized && this.auth.autorized.token,
          history: this.settings.history
        },
        data => {
          console.log('Client rights: ', data)
          // if no read access for the data
          if (!data.read) {
            // TODO: request authentication again
          }
        }
      )
    },
    dataUpdate: function(data) {
      console.log('dataUpdate', data)
      this.$store.dispatch('data/updateData', data)
    }
  },
  mounted() {
    // get the server status and app settings
    this.connectToServer()
    // verify the authentication
    this.verifyAuthentication()
  },
  computed: {
    ...mapState({
      settings: state => state.settings,
      auth: state => state.auth
    })
  },
  methods: {
    connectToServer() {
      // this function calls itself each 2 seconds if there's a problem
      // trying to connect to the server by first time
      this.getServerSettings().catch(err => {
        console.log('ERR', err)
        setTimeout(() => {
          this.connectToServer()
        }, 2000)
      })
    },
    ...mapActions(['getServerSettings', 'verifyAuthentication'])
  }
}
</script>
