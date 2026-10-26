import apiClient, { USE_MOCK_API } from './apiClient'
import { decideReview as decideMockReview, getReviews as getMockReviews } from './mockAdapter'

export async function getReviews() {
  if (USE_MOCK_API) return getMockReviews()
  const response = await apiClient.get('/reviews')
  return response.data
}

export async function decideReview(reviewId, payload) {
  if (USE_MOCK_API) return decideMockReview(reviewId, payload)
  const response = await apiClient.post('/reviews/' + encodeURIComponent(reviewId) + '/decision', payload)
  return response.data
}
