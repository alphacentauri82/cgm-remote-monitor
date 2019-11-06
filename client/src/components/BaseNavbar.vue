<template>
  <v-app-bar app dark>
    <v-app-bar-nav-icon>
      <v-img :src="require('../assets/logo2.png')"></v-img>
    </v-app-bar-nav-icon>
    <v-toolbar-title>Nightscout</v-toolbar-title>
    <v-spacer></v-spacer>
    <v-app-bar-nav-icon
      v-on:click.stop="$emit('showSidebar')"
      absolute
      right
    ></v-app-bar-nav-icon>
  </v-app-bar>
</template>

<script>
export default {}
</script>

<style></style>
