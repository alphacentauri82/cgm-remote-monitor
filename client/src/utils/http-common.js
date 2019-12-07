import axios from 'axios'

/**
 * Setup the Axios object
 */
export const apiClient = axios.create({
  baseURL: process.env.VUE_APP_BACKEND_BASE_URL,
  withCredentials: false
})
