import VueSocketIO from 'vue-socket.io'

export default new VueSocketIO({
  debug: true,
  connection: process.env.VUE_APP_BACKEND_SOCKET
})
