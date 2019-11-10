<template>
  <div>
    <BaseSidebar />

    <v-app-bar app clipped-right>
      <v-app-bar-nav-icon>
        <v-img :src="require('../assets/logo2.png')"></v-img>
      </v-app-bar-nav-icon>

      <v-toolbar-title>Nightscout</v-toolbar-title>

      <v-spacer></v-spacer>

      <v-app-bar-nav-icon @click="toggleDrawer" right></v-app-bar-nav-icon>
    </v-app-bar>
  </div>
</template>

<script>
import { mapActions } from 'vuex'

export default {
  name: 'BaseNavbar',
  methods: {
    ...mapActions(['toggleDrawer'])
  }
}
</script>

<style></style>
