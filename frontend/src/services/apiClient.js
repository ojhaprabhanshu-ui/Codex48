import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
export const USE_MOCK_API = import.meta.env.DEV &&
  String(import.meta.env.VITE_USE_MOCK_API ?? 'true').toLowerCase() === 'true'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 25000,
  headers: { 'Content-Type': 'application/json' },
})

export function getApiErrorMessage(error) {
  return error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    'Something went wrong. Please try again.'
}

export default apiClient
