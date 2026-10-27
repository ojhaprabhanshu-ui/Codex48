import 'dotenv/config'
import { pool, inTransaction } from './pool.js'

const rules = [
  ['RULE-001', 'prohibited_claim', 'No cure or treatment claims', 'Do not claim that products cure, treat, or heal acne or any skin condition.', { severity: 'high', suggestion: 'Replace this with an approved product fact, such as “supports healthy-looking skin.”', patterns: [{ regex: '\\b(?:cure|cures|cured|curing|treat|treats|treated|heal|heals|healed)\\s+(?:acne|skin conditions?)\\b(?:\\s+in\\s+\\d+\\s+days?)?', flags: 'gi' }] }],
  ['RULE-002', 'disclosure', 'Disclose paid promotion', 'Paid promotional content must include #ad or #sponsored.', { severity: 'high', suggestion: 'Add #ad or #sponsored to this paid promotion.', required_for_content_types: ['paid_promo', 'ad_copy'], required_patterns: ['#(?:ad|sponsored)\\b'], required_explanation: 'This paid promotional content needs an #ad or #sponsored disclosure.' }],
  ['RULE-003', 'approved_facts', 'Use approved product facts', 'Approved product fact: supports healthy-looking skin.', { advisory: true, severity: 'info', approved_facts: ['Supports healthy-looking skin.'], patterns: [] }],
  ['RULE-004', 'tone', 'Keep calls to action informative', 'Use informative, respectful wording. Avoid pressure tactics such as “buy now” or “last chance.”', { severity: 'medium', suggestion: 'Consider a neutral call to action such as “Explore the collection.”', patterns: [{ regex: '\\b(?:buy\\s+now|last\\s+chance|only\\s+today|hurry)\\b', flags: 'gi' }] }],
  ['RULE-005', 'guarantee', 'No guaranteed results', 'Do not guarantee results or promise a specific outcome.', { severity: 'high', suggestion: 'Describe product features without guaranteeing an outcome.', patterns: [{ regex: '\\b(?:guaranteed?\\s+(?:results?|to)|100%\\s+(?:effective|guaranteed)|results?\\s+guaranteed)\\b', flags: 'gi' }] }],
  ['RULE-006', 'comparative', 'No competitor disparagement', 'Do not disparage competitors by name.', { severity: 'medium', suggestion: 'Focus on GlowCare’s product qualities rather than another brand.', patterns: [{ regex: '\\b(?:better|worse)\\s+than\\s+(?:the\\s+)?(?:competition|competitors?)\\b', flags: 'gi' }] }],
]

try {
  await inTransaction(async (client) => {
    const { rows } = await client.query("INSERT INTO brands (name) VALUES ('GlowCare') ON CONFLICT DO NOTHING RETURNING id")
    let brandId = rows[0]?.id
    if (!brandId) brandId = (await client.query('SELECT id FROM brands WHERE name=$1 ORDER BY id LIMIT 1', ['GlowCare'])).rows[0].id
    for (const [code, type, title, text, config] of rules) {
      await client.query(
        `INSERT INTO guidelines (brand_id, rule_code, type, title, category, text, config_json, active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,true)
         ON CONFLICT (brand_id, rule_code) DO UPDATE SET type=EXCLUDED.type, title=EXCLUDED.title,
         category=EXCLUDED.category, text=EXCLUDED.text, config_json=EXCLUDED.config_json, active=true`,
        [brandId, code, type, title, type === 'approved_facts' ? 'Approved facts' : ['prohibited_claim', 'guarantee', 'comparative'].includes(type) ? 'Claims' : type[0].toUpperCase() + type.slice(1), text, JSON.stringify(config)],
      )
    }
  })
  console.log('GlowCare and RULE-001 through RULE-006 are seeded.')
} finally { await pool.end() }
