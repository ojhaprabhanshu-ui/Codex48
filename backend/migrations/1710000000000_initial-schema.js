export const up = (pgm) => {
  pgm.createType('submission_content_type', ['paid_promo', 'organic_post', 'ad_copy', 'email'])
  pgm.createType('submission_status', ['draft', 'analyzed', 'pending_review', 'approved', 'rejected', 'changes_requested'])
  pgm.createType('finding_source', ['rule_engine', 'gemini'])
  pgm.createType('finding_severity', ['high', 'medium', 'low', 'info'])
  pgm.createType('review_decision', ['approve', 'reject', 'request_changes'])

  pgm.createTable('brands', {
    id: 'id', name: { type: 'varchar(160)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })
  pgm.addConstraint('brands', 'brands_name_unique', { unique: ['name'] })
  pgm.createTable('guidelines', {
    id: 'id', brand_id: { type: 'integer', notNull: true, references: 'brands', onDelete: 'CASCADE' },
    rule_code: { type: 'varchar(80)', notNull: true }, type: { type: 'varchar(80)', notNull: true },
    text: { type: 'text', notNull: true }, config_json: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    active: { type: 'boolean', notNull: true, default: true }, title: { type: 'varchar(200)' },
    category: { type: 'varchar(100)' },
  })
  pgm.addConstraint('guidelines', 'guidelines_brand_rule_code_unique', { unique: ['brand_id', 'rule_code'] })
  pgm.createTable('submissions', {
    id: 'id', brand_id: { type: 'integer', notNull: true, references: 'brands', onDelete: 'RESTRICT' },
    title: { type: 'varchar(120)' }, platform: { type: 'varchar(80)' },
    content: { type: 'text', notNull: true },
    content_type: { type: 'submission_content_type', notNull: true },
    status: { type: 'submission_status', notNull: true, default: 'draft' }, ml_risk_json: { type: 'jsonb' },
    suggested_rewrite: { type: 'text' }, edited_rewrite: { type: 'text' },
    analysis_version: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })
  pgm.addConstraint('submissions', 'submissions_content_length_check', { check: 'char_length(content) BETWEEN 1 AND 5000' })
  pgm.createTable('findings', {
    id: 'id', submission_id: { type: 'integer', notNull: true, references: 'submissions', onDelete: 'CASCADE' },
    analysis_version: { type: 'integer', notNull: true }, rule_code: { type: 'varchar(80)', notNull: true },
    source: { type: 'finding_source', notNull: true }, category: { type: 'varchar(100)', notNull: true },
    severity: { type: 'finding_severity', notNull: true }, quoted_span: { type: 'text' },
    start_idx: { type: 'integer' }, end_idx: { type: 'integer' }, explanation: { type: 'text', notNull: true },
    suggestion: { type: 'text' }, advisory: { type: 'boolean', notNull: true, default: false },
  })
  pgm.createTable('reviews', {
    id: 'id', submission_id: { type: 'integer', notNull: true, references: 'submissions', onDelete: 'CASCADE' },
    decision: { type: 'review_decision', notNull: true }, comment: { type: 'text' },
    reviewer_name: { type: 'varchar(160)', notNull: true, default: 'Reviewer' },
    client_request_id: { type: 'varchar(160)' }, reviewed_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })
  pgm.addConstraint('reviews', 'reviews_submission_client_request_unique', { unique: ['submission_id', 'client_request_id'] })
  pgm.createIndex('submissions', ['brand_id', 'status', { name: 'created_at', sort: 'DESC' }])
  pgm.createIndex('findings', ['submission_id', 'analysis_version'])
}

export const down = (pgm) => {
  pgm.dropTable('reviews')
  pgm.dropTable('findings')
  pgm.dropTable('submissions')
  pgm.dropTable('guidelines')
  pgm.dropTable('brands')
  pgm.dropType('review_decision')
  pgm.dropType('finding_severity')
  pgm.dropType('finding_source')
  pgm.dropType('submission_status')
  pgm.dropType('submission_content_type')
}
