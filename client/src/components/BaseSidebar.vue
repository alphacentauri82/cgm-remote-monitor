<template>
  <v-navigation-drawer v-if="drawer" app absolute permanent right dark>
    <v-list>
      <v-list-item>
        <v-list-item-content>
          <v-list-item-title>Options</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
    </v-list>
    <v-divider></v-divider>
    <v-list dense nav>
      <v-list-item v-for="item in items" :key="item.title" link>
        <v-list-item-content>
          <v-list-item-title>{{ item.title }}</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-list-item>
        <v-btn color="primary" dark v-on:click.stop="$emit('displaySettings')"
          >DashBoard Settings</v-btn
        >
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<script>
export default {
  props: {
    drawer: { required: true }
  },
  watch: {
    group() {
      this.drawer = false
    }
  },
  data() {
    return {
      items: [
        { title: 'Reports' },
        { title: 'Profile Editor' },
        { title: 'Admin Tools' }
      ]
    }
  }
}
</script>
