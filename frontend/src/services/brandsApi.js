import apiClient from './apiClient'
import { USE_MOCK_API } from './apiClient'
import { getBrands as getMockBrands } from './mockAdapter'

export async function getBrands() {
  if (USE_MOCK_API) return getMockBrands()
  const response = await apiClient.get('/brands')
  return response.data
}
