import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowDownRight,
  ArrowRight,
  Check,
  Clipboard,
  FileSearch2,
  LoaderCircle,
  RotateCcw,
  ShieldAlert,
  BookOpenText,
  Sparkles,
  WandSparkles,
  X,
} from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import EmptyState from '../components/common/EmptyState'
import ErrorState from '../components/common/ErrorState'
import StatusBadge from '../components/common/StatusBadge'
import ContentEditor from '../components/analyzer/ContentEditor'
import FindingCard from '../components/analyzer/FindingCard'
import HighlightedContent from '../components/analyzer/HighlightedContent'
import RiskIndicator from '../components/analyzer/RiskIndicator'
import MediaUploadField from '../components/analyzer/MediaUploadField'
import PlatformSelect from '../components/analyzer/PlatformSelect'
import { useAppContext } from '../context/useAppContext'
import { samplePromotionalContent } from '../data/mockData'
import { createSubmission, updateSubmission } from '../services/submissionsApi'
import { analyzeSubmission } from '../services/analysisApi'
import { getApiErrorMessage, USE_MOCK_API } from '../services/apiClient'

const contentTypes = [
  { value: 'paid_promo', label: 'Paid promotion' },
  { value: 'organic_post', label: 'Organic post' },
  { value: 'ad_copy', label: 'Ad copy' },
  { value: 'email', label: 'Email' },
]

const platforms = ['Instagram', 'LinkedIn', 'Facebook', 'X', 'Other']
const EMPTY_FINDINGS = Object.freeze([])

function readSubmissionId(response) {
  return response?.id || response?.submission_id || response?.submission?.id || response?.data?.id
}

function normalizeAnalysis(response) {
  const result = response?.analysis || response?.data?.analysis || response?.data || response
  const allFindings = Array.isArray(result?.findings) ? result.findings : []
  const ruleFindings = allFindings.filter((finding) => !['gemini', 'llm'].includes(String(finding.source || '').toLowerCase()))
  const geminiFindings = Array.isArray(result?.gemini_findings)
    ? result.gemini_findings
    : allFindings.filter((finding) => ['gemini', 'llm'].includes(String(finding.source || '').toLowerCase()))
  return { ...result, findings: allFindings, ruleFindings, geminiFindings }
}

function FieldLabel({ htmlFor, children, optional }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-ink">
      <span>{children}</span>
      {optional && <span className="text-[10px] font-normal text-muted">Optional</span>}
    </label>
  )
}

function SectionHeading({ icon: Icon, title, count, hint }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-canvas text-secondary"><Icon size={14} aria-hidden="true" /></div>
        <h3 className="text-xs font-semibold text-ink">{title}</h3>
        {Number.isInteger(count) && <span className="rounded-full bg-canvas px-2 py-0.5 text-[9px] font-medium text-muted">{count}</span>}
      </div>
      {hint && <span className="text-[10px] text-muted">{hint}</span>}
    </div>
  )
}

export default function AnalyzerPage() {
  const { brands, activeBrand, activeBrandId, setActiveBrandId } = useAppContext()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [contentType, setContentType] = useState('paid_promo')
  const [platform, setPlatform] = useState('')
  const [validationError, setValidationError] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [submission, setSubmission] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [coldStart, setColdStart] = useState(false)
  const [rewrite, setRewrite] = useState('')
  const [selectedCitation, setSelectedCitation] = useState(null)
  const [hasImage, setHasImage] = useState(false)
  const [mediaResetKey, setMediaResetKey] = useState(0)

  const findings = analysis?.findings || EMPTY_FINDINGS
  const ruleFindings = analysis?.ruleFindings || []
  const geminiFindings = analysis?.geminiFindings || []
  const referencedGuidelines = useMemo(() => {
    const seen = new Set()
    return findings.filter((finding) => {
      const id = finding.rule_code || finding.rule_id || finding.guideline_id
      if (!id || seen.has(id)) return false
      seen.add(id)
      return true
    })
  }, [findings])

  async function runAnalysis(event, overrideContent) {
    event?.preventDefault()
    const text = String(overrideContent ?? content).trim()
    if (!activeBrandId) {
      setValidationError('Select a brand before analyzing content.')
      return
    }
    if (!title.trim()) {
      setValidationError('Add a title for this submission.')
      return
    }
    if (!text || text.length > 5000) {
      setValidationError('Enter promotional content between 1 and 5,000 characters.')
      return
    }

    setValidationError('')
    setError('')
    setAnalysis(null)
    const isRevision = overrideContent !== undefined && Boolean(submission?.id)
    if (!isRevision) setSubmission(null)
    setLoading(true)
    setColdStart(false)
    const coldStartTimer = window.setTimeout(() => setColdStart(true), 5000)

    try {
      const payload = {
        brand_id: activeBrandId,
        title: title.trim(),
        content: text,
        content_type: contentType,
        platform: platform || null,
      }
      const savedSubmission = isRevision
        ? await updateSubmission(submission.id, payload)
        : await createSubmission(payload)
      const id = readSubmissionId(savedSubmission)
      if (!id) throw new Error('The API saved the request without returning a submission ID.')
      setSubmission({ ...savedSubmission, id, content: text })
      const response = await analyzeSubmission(id)
      const result = normalizeAnalysis(response)
      setSubmission((current) => current ? { ...current, status: 'analyzed', analysis: result, analysis_history: response.analysis_history || current.analysis_history } : current)
      setAnalysis(result)
      setRewrite(result.suggested_rewrite || result.suggested_correction || text)
      toast.success(USE_MOCK_API ? 'Demo rule check complete' : 'Analysis complete')
    } catch (requestError) {
      const message = getApiErrorMessage(requestError)
      setError(message)
      toast.error(message)
    } finally {
      window.clearTimeout(coldStartTimer)
      setLoading(false)
      setColdStart(false)
    }
  }

  function clearForm() {
    setTitle('')
    setContent('')
    setContentType('paid_promo')
    setPlatform('')
    setAnalysis(null)
    setSubmission(null)
    setError('')
    setValidationError('')
    setRewrite('')
    setHasImage(false)
    setMediaResetKey((current) => current + 1)
  }

  function loadExample() {
    setTitle('GlowCare launch caption')
    setContent(samplePromotionalContent)
    setContentType('paid_promo')
    setPlatform('Instagram')
    setValidationError('')
    toast('Example loaded. Run the check when you’re ready.', { icon: '✦' })
  }

  async function copyRewrite() {
    if (!rewrite) return
    try {
      await navigator.clipboard.writeText(rewrite)
      toast.success('Draft copied to clipboard')
    } catch {
      toast.error('Clipboard access is unavailable in this browser.')
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
      <PageHeader
        eyebrow="Content review"
        title="Check your draft before it goes live."
        description="Compare promotional content with the selected brand’s guidelines and make evidence easy to review."
        action={<div className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-[11px] font-medium text-secondary"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Brand workspace</div>}
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.1fr)]">
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6" aria-labelledby="editor-heading">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-accent-soft text-accent"><FileSearch2 size={16} aria-hidden="true" /></div>
                <h2 id="editor-heading" className="text-sm font-semibold text-ink">New content check</h2>
              </div>
              <p className="mt-2 text-xs leading-5 text-secondary">Start with the copy as it will appear to your audience.</p>
            </div>
            <button type="button" onClick={loadExample} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-accent hover:bg-accent-soft">
              <Sparkles size={12} aria-hidden="true" /> Try sample
            </button>
          </div>

          <form onSubmit={runAnalysis} className="mt-6 space-y-[18px]">
            <div>
              <FieldLabel htmlFor="brand-select">Brand</FieldLabel>
              <select id="brand-select" value={activeBrandId || ''} onChange={(event) => setActiveBrandId(event.target.value)} className="field-control h-11">
                {brands.length === 0 && <option value="">No brands available</option>}
                {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
              </select>
            </div>

            <div>
              <FieldLabel htmlFor="content-title">Content title</FieldLabel>
              <input id="content-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="e.g. Spring launch caption" className="field-control h-11" />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <FieldLabel htmlFor="content">Promotional content</FieldLabel>
                <button type="button" onClick={() => setContent('')} className="text-[10px] font-medium text-muted hover:text-ink">Clear text</button>
              </div>
              <ContentEditor id="content" value={content} onChange={setContent} placeholder="Paste or write the post you’d like to check…" />
              <div className="mt-2 flex items-center justify-between text-[10px] text-muted">
                <span>Checks use the content exactly as entered.</span>
                <span id="content-counter" aria-live="polite">{content.length.toLocaleString()} / 5,000</span>
              </div>
              <div className="mt-5">
                <div className="mb-3">
                  <h3 className="text-xs font-semibold text-ink">Promotional image <span className="font-normal text-muted">Optional</span></h3>
                  <p className="mt-1 text-[10px] leading-4 text-secondary">Select an image to preview it. Image analysis is not connected yet.</p>
                </div>
                <div className="max-w-sm">
                  <MediaUploadField key={'image-' + mediaResetKey} type="image" onFileChange={(file) => setHasImage(Boolean(file))} />
                </div>
                {hasImage && <p className="notice-warning mt-3 rounded-xl border px-3 py-2.5 text-[10px] leading-4" role="status"><strong>Image selected, text only.</strong> The selected image stays in this browser and will not be submitted or analyzed.</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="content-type">Content type</FieldLabel>
                <select id="content-type" value={contentType} onChange={(event) => setContentType(event.target.value)} className="field-control h-11">
                  {contentTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel htmlFor="platform" optional>Platform</FieldLabel>
                <PlatformSelect id="platform" value={platform} onChange={setPlatform} options={platforms} />
              </div>
            </div>

            {(validationError || error) && (
              <div className="notice-error rounded-xl border px-3.5 py-3 text-xs leading-5" role="alert">
                {validationError || error}
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" onClick={clearForm} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-xs font-medium text-secondary transition hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50">
                <RotateCcw size={14} aria-hidden="true" /> Clear form
              </button>
              <button type="submit" disabled={loading || brands.length === 0} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-xs font-semibold text-white shadow-sm shadow-indigo-900/10 transition hover:bg-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <WandSparkles size={15} aria-hidden="true" />}
                {loading ? 'Checking content…' : hasImage ? 'Analyze text only' : 'Analyze content'}
                {!loading && <ArrowRight size={14} aria-hidden="true" />}
              </button>
            </div>
          </form>
        </section>

        <section className="min-h-[540px] rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6" aria-labelledby="result-heading" aria-live="polite">
          {loading ? (
            <div className="flex min-h-[495px] flex-col items-center justify-center px-4 text-center">
              <div className="relative grid h-16 w-16 place-items-center rounded-[22px] bg-accent-soft text-accent">
                <LoaderCircle size={27} className="animate-spin" aria-hidden="true" />
                <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-surface bg-indigo-400" />
              </div>
              <h2 className="mt-5 text-base font-semibold text-ink">Checking your content</h2>
              <p className="mt-2 max-w-sm text-xs leading-5 text-secondary">
                {coldStart ? 'The server is taking a little longer to respond. It may be waking up.' : 'Preparing the submission and requesting an analysis from the configured source.'}
              </p>
              <div className="mt-7 flex items-center gap-2 text-[10px] font-medium text-muted"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" /> {USE_MOCK_API ? 'Running demo rule checks' : 'Waiting for the analysis service'}</div>
              <span className="sr-only">Analysis in progress</span>
            </div>
          ) : error ? (
            <div className="flex min-h-[495px] flex-col justify-center">
              <ErrorState message={error} onRetry={(event) => runAnalysis(event)} />
              <p className="mt-3 text-center text-[10px] text-muted">Your content is still available in the editor.</p>
            </div>
          ) : analysis ? (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">Analysis result</p>
                  <h2 id="result-heading" className="text-base font-semibold tracking-tight text-ink">{submission?.title || title}</h2>
                  <p className="mt-1 text-[10px] text-muted">{submission?.id ? 'Submission ' + submission.id : 'Submission created'} · {activeBrand?.name || 'Brand'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2"><StatusBadge status={analysis.status || 'analyzed'}>{USE_MOCK_API ? 'Demo rules checked' : (analysis.status || 'Analyzed')}</StatusBadge>{submission?.id && <Link to={'/analysis/' + encodeURIComponent(submission.id)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[10px] font-semibold text-secondary hover:bg-canvas">Saved details <ArrowRight size={12} /></Link>}</div>
              </div>

              {USE_MOCK_API && (
                <div className="notice-warning mt-4 rounded-xl border px-3.5 py-3 text-xs leading-5">
                  <strong>Fixture analysis.</strong> Only the sample deterministic rules ran. No ML classifier or Gemini response was generated.
                </div>
              )}
              {hasImage && <div className="notice-warning mt-3 rounded-xl border px-3.5 py-3 text-xs leading-5" role="status"><strong>Text-only analysis complete.</strong> The selected image stayed in the browser and was not included in this analysis.</div>}

              <div className="mt-4 rounded-2xl border border-line bg-canvas p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Review summary</p>
                  <span className="text-[10px] font-medium text-secondary">{findings.filter((finding) => !finding.advisory).length} {findings.filter((finding) => !finding.advisory).length === 1 ? 'finding' : 'findings'}</span>
                </div>
                <p className="mt-2 text-sm font-medium leading-6 text-ink">
                  {findings.length > 0
                    ? 'Review the listed guideline findings and proposed draft before sending this content to a human reviewer.'
                    : 'No findings were returned by the configured checks. A human reviewer must still make the final approval decision.'}
                </p>
              </div>

              {Array.isArray(analysis.warnings) && analysis.warnings.length > 0 && (
                <div className="mt-4 space-y-2">
                  {analysis.warnings.map((warning, index) => (
                    <div key={warning.code || index} className="notice-info rounded-xl border px-3.5 py-3 text-xs leading-5">
                      <strong>{warning.code === 'MOCK_AI_UNAVAILABLE' ? 'AI services not called.' : 'Analysis warning.'}</strong> {warning.message || 'Part of the analysis could not be completed.'}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 space-y-5">
                <section>
                  <SectionHeading icon={ShieldAlert} title="ML risk signal" hint="Advisory only" />
                  <RiskIndicator risk={analysis.ml_risk || null} />
                </section>

                <section>
                  <SectionHeading icon={FileSearch2} title="Rule engine findings" count={ruleFindings.length} />
                  {ruleFindings.length ? (
                    <div className="space-y-3">{ruleFindings.map((finding, index) => <FindingCard key={finding.id || index} finding={finding} onViewGuideline={setSelectedCitation} />)}</div>
                  ) : (
                    <div className="notice-success rounded-xl border px-3.5 py-3 text-xs leading-5">No deterministic rule findings were returned.</div>
                  )}
                </section>

                <section>
                  <SectionHeading icon={Sparkles} title="Gemini contextual findings" count={geminiFindings.length} />
                  {geminiFindings.length ? (
                    <div className="space-y-3">{geminiFindings.map((finding, index) => <FindingCard key={finding.id || index} finding={{ ...finding, source: 'gemini' }} onViewGuideline={setSelectedCitation} />)}</div>
                  ) : (
                    <div className="rounded-xl border border-line bg-canvas px-3.5 py-3 text-xs leading-5 text-secondary">
                      {USE_MOCK_API ? 'Not available in fixture mode. Gemini was not called.' : 'No Gemini findings were returned.'}
                    </div>
                  )}
                </section>

                <section>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <SectionHeading icon={WandSparkles} title="Suggested correction" />
                    <button type="button" onClick={copyRewrite} disabled={!rewrite} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-semibold text-accent hover:bg-accent-soft disabled:opacity-50"><Clipboard size={12} aria-hidden="true" /> Copy draft</button>
                  </div>
                  <textarea value={rewrite} onChange={(event) => setRewrite(event.target.value)} maxLength={5000} className="field-control min-h-28 resize-y leading-6" aria-label="Editable suggested correction" />
                  <p className="mt-2 text-[10px] leading-4 text-muted">{USE_MOCK_API ? 'Rule-based fixture draft. Edit freely; it is not an AI-generated recommendation.' : 'Editable draft. Review each change before use.'}</p>
                  <button
                    type="button"
                    onClick={(event) => {
                      setContent(rewrite)
                      runAnalysis(event, rewrite)
                    }}
                    disabled={!rewrite.trim() || loading}
                    className="mt-3 inline-flex h-9 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-[11px] font-semibold text-secondary hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RotateCcw size={13} aria-hidden="true" /> Analyze edited draft
                  </button>
                </section>

                <section className="rounded-2xl border border-line p-4">
                  <SectionHeading icon={ArrowDownRight} title="Original content" hint="Highlighted spans show cited text" />
                  <HighlightedContent content={analysis.original_content || submission?.content || content} findings={findings} />
                </section>

                <section>
                  <SectionHeading icon={BookOpenText} title="Referenced brand guidelines" count={referencedGuidelines.length} />
                  {referencedGuidelines.length ? (
                    <div className="space-y-2">
                      {referencedGuidelines.map((finding, index) => {
                        const id = finding.rule_code || finding.rule_id || finding.guideline_id
                        return <button key={id || index} type="button" onClick={() => setSelectedCitation(finding)} className="flex w-full items-start gap-3 rounded-xl border border-line bg-surface p-3 text-left transition hover:border-accent/30 hover:bg-accent-soft/30">
                          <span className="shrink-0 rounded-md bg-canvas px-2 py-1 font-mono text-[10px] font-semibold text-secondary">{id}</span>
                          <span className="min-w-0">
                            <span className="block text-xs font-semibold text-ink">{finding.guideline_title || 'Guideline source'}</span>
                            <span className="mt-1 block text-xs leading-5 text-secondary">{finding.guideline_text || 'Full source wording was not included in the API response.'}</span>
                          </span>
                        </button>
                      })}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-line bg-canvas px-3.5 py-3 text-xs leading-5 text-secondary">No guideline citations were included in the response.</p>
                  )}
                </section>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[495px] flex-col justify-center">
              <EmptyState
                title="Your results will appear here"
                description="Submit a draft to see guideline findings, a separate risk signal, and any contextual analysis returned by the configured API."
              />
              <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
                {[
                  ['01', 'Exact rules', 'Stable guideline references'],
                  ['02', 'Context', 'AI results when connected'],
                  ['03', 'Human review', 'Approval stays with a person'],
                ].map(([number, label, text]) => (
                  <div key={number} className="rounded-xl border border-line bg-canvas px-3 py-3">
                    <p className="text-[9px] font-semibold tracking-[0.12em] text-accent">{number}</p>
                    <p className="mt-2 text-[11px] font-semibold text-ink">{label}</p>
                    <p className="mt-1 text-[10px] leading-4 text-secondary">{text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-center gap-1.5 text-[10px] text-muted"><Check size={12} aria-hidden="true" /> Brand-specific checks · no unsupported confidence scores</div>
            </div>
          )}
        </section>
      </div>

      <AnimatePresence>
        {selectedCitation && (
          <motion.div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/40 p-3 backdrop-blur-[2px] sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedCitation(null) }}>
            <motion.section role="dialog" aria-modal="true" aria-labelledby="citation-title" className="w-full max-w-lg rounded-2xl border border-line bg-surface p-5 shadow-elevated" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">Source guideline</p>
                  <h2 id="citation-title" className="mt-1 text-base font-semibold text-ink">{selectedCitation.rule_code || selectedCitation.rule_id || selectedCitation.guideline_id || 'Guideline'}</h2>
                </div>
                <button type="button" onClick={() => setSelectedCitation(null)} className="grid h-8 w-8 place-items-center rounded-lg text-secondary hover:bg-canvas" aria-label="Close guideline details"><X size={16} aria-hidden="true" /></button>
              </div>
              <p className="mt-3 text-sm font-medium text-ink">{selectedCitation.guideline_title || 'Cited brand rule'}</p>
              <p className="mt-2 rounded-xl bg-canvas p-3.5 text-sm leading-6 text-secondary">{selectedCitation.guideline_text || 'The API did not include the original guideline text for this finding.'}</p>
              <p className="mt-3 text-[10px] leading-4 text-muted">Guideline details are shown as returned with the analysis. A citation is only as authoritative as the backend record.</p>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
