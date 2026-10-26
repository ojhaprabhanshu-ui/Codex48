import apiClient, { USE_MOCK_API } from './apiClient'
import { analyzeSubmission as analyzeMockSubmission, getAnalysis as getMockAnalysis } from './mockAdapter'

export async function analyzeSubmission(submissionId) {
  if (USE_MOCK_API) return analyzeMockSubmission(submissionId)
  const response = await apiClient.post('/submissions/' + encodeURIComponent(submissionId) + '/analyze')
  return response.data
}

export async function getAnalysis(analysisId) {
  if (USE_MOCK_API) return getMockAnalysis(analysisId)
  const response = await apiClient.get('/analyses/' + encodeURIComponent(analysisId))
  return response.data
}
