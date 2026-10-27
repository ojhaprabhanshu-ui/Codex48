import apiClient, { USE_MOCK_API } from './apiClient'
import {
  createGuideline as createMockGuideline,
  deleteGuideline as deleteMockGuideline,
  getGuidelines as getMockGuidelines,
  updateGuideline as updateMockGuideline,
} from './mockAdapter'

export async function getGuidelines(brandId) {
  if (USE_MOCK_API) return getMockGuidelines(brandId)
  const response = await apiClient.get('/guidelines', { params: { brand_id: brandId } })
  return response.data
}

export async function createGuideline(payload) {
  if (USE_MOCK_API) return createMockGuideline(payload)
  const response = await apiClient.post('/guidelines', payload)
  return response.data
}

export async function updateGuideline(id, payload) {
  if (USE_MOCK_API) return updateMockGuideline(id, payload)
  const response = await apiClient.put('/guidelines/' + encodeURIComponent(id), payload)
  return response.data
}

export async function deleteGuideline(id) {
  if (USE_MOCK_API) return deleteMockGuideline(id)
  const response = await apiClient.delete('/guidelines/' + encodeURIComponent(id))
  return response.data
}
