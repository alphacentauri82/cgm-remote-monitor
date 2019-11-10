<template>
  <v-navigation-drawer
    v-model="drawer.open"
    :clipped="drawer.clipped"
    :right="drawer.right"
    app
  >
    <v-list dense nav>
      <v-list-item v-for="item in items" :key="item.title" link :to="item.to">
        <v-list-item-content>
          <v-list-item-title>{{ $t(item.title) }}</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<script>
import { mapState } from 'vuex'

export default {
  name: 'BaseSidebar',
  data() {
    return {
      items: [
        { title: 'sidebar.reports', to: '/reports' },
        { title: 'sidebar.profile_editor', to: '/profile' },
        { title: 'sidebar.admin_tools', to: '/admin-tools' },
        { title: 'sidebar.settings', to: '/settings' }
      ]
    }
  },
  computed: {
    ...mapState({
      drawer: state => state.drawer
    })
  }
}
</script>
