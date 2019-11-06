/**
 *
 * @param {*} type Type of the Notification
 * @param {*} message Message to display as Notification
 * @param {*} dispatch Dispatch object of Vuex
 */
export const publishNotification = (type, message, dispatch) => {
  const notification = { type, message }
  dispatch('notification/add', notification, { root: true })
}
