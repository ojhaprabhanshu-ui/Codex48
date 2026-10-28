export const up = (pgm) => {
  pgm.sql("ALTER TYPE finding_source ADD VALUE IF NOT EXISTS 'ml'")
}

export const down = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM findings
        WHERE source::text = 'ml' OR source_type = 'ml'
      ) THEN
        RAISE EXCEPTION 'Cannot remove finding_source.ml while ML findings remain.';
      END IF;
    END $$;

    ALTER TYPE finding_source RENAME TO finding_source_with_ml;
    CREATE TYPE finding_source AS ENUM ('rule_engine', 'gemini');
    ALTER TABLE findings
      ALTER COLUMN source TYPE finding_source
      USING source::text::finding_source;
    DROP TYPE finding_source_with_ml;
  `)
}
