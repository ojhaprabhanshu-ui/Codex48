export const up = (pgm) => {
  pgm.addColumn('findings', { source_type: { type: 'varchar(32)' } })
  pgm.sql("UPDATE findings SET source_type = CASE WHEN source = 'gemini' THEN 'ai' ELSE 'deterministic' END")
  pgm.alterColumn('findings', 'source_type', { notNull: true })
}

export const down = (pgm) => {
  pgm.dropColumn('findings', 'source_type')
}

