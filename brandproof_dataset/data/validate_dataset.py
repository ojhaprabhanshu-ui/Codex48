"""Sanity-check brandproof_dataset.csv. Run: python data/validate_dataset.py"""
import csv, re, json, collections, sys
rows = list(csv.DictReader(open("data/brandproof_dataset.csv", encoding="utf-8")))
has_ad = lambda t: re.search(r"#ad\b", t, re.I) is not None
errs = []
ids = [r["sample_id"] for r in rows]
if len(ids) != len(set(ids)): errs.append("duplicate sample_id")
for r in rows:
    p, ev, rules, lab = r["post_text"], r["evidence_excerpt"], r["expected_rule_ids"], r["expected_label"]
    if ev and ev not in p: errs.append(f"{r['sample_id']}: evidence not in post")
    if lab == "compliant" and (rules or not has_ad(p)): errs.append(f"{r['sample_id']}: bad compliant row")
    if "D-01" in rules and has_ad(p): errs.append(f"{r['sample_id']}: D-01 flagged but #ad present")
    if "D-01" not in rules and lab != "compliant" and not has_ad(p): errs.append(f"{r['sample_id']}: #ad missing but D-01 not flagged")
    if lab == "violation" and not rules: errs.append(f"{r['sample_id']}: violation without rule")
json.load(open("data/gemini_test_cases.json", encoding="utf-8")); json.load(open("data/brand_guidelines.json", encoding="utf-8"))
print("rows:", len(rows), dict(collections.Counter(r["expected_label"] for r in rows)))
print("split:", dict(collections.Counter(r["split"] for r in rows)))
print("rules:", dict(collections.Counter(r["expected_rule_ids"] or "none" for r in rows)))
print("OK" if not errs else "\n".join(errs)); sys.exit(1 if errs else 0)
