import apiClient, { USE_MOCK_API } from './apiClient'
import { analyzeSubmission as analyzeMockSubmission, getAnalysis as getMockAnalysis } from './mockAdapter'

export async function analyzeSubmission(submissionId) {
  if (USE_MOCK_API) return analyzeMockSubmission(submissionId)
  const response = await apiClient.post('/submissions/' + encodeURIComponent(submissionId) + '/analyze', undefined, { timeout: 270000 })
  return response.data
}

export async function getAnalysis(analysisId) {
  if (USE_MOCK_API) return getMockAnalysis(analysisId)
  const response = await apiClient.get('/submissions/' + encodeURIComponent(analysisId))
  return response.data
}

export async function submitSubmission(submissionId) {
  if (USE_MOCK_API) return getMockAnalysis(submissionId)
  const response = await apiClient.post('/submissions/' + encodeURIComponent(submissionId) + '/submit')
  return response.data
}
