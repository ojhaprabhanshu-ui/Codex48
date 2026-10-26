import apiClient, { USE_MOCK_API } from './apiClient'
import {
  createSubmission as createMockSubmission,
  getSubmission as getMockSubmission,
  getSubmissions as getMockSubmissions,
} from './mockAdapter'

export async function getSubmissions(params) {
  if (USE_MOCK_API) return getMockSubmissions(params)
  const response = await apiClient.get('/submissions', { params })
  return response.data
}

export async function getSubmission(id) {
  if (USE_MOCK_API) return getMockSubmission(id)
  const response = await apiClient.get('/submissions/' + encodeURIComponent(id))
  return response.data
}

export async function createSubmission(payload) {
  if (USE_MOCK_API) return createMockSubmission(payload)
  const response = await apiClient.post('/submissions', payload)
  return response.data
}
