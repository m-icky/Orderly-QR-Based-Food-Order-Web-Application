import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  timeout: 15000,
})

// Attach JWT token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('orderly_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('orderly_token')
      localStorage.removeItem('orderly_auth') // Clear Zustand persist key
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/admin/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
