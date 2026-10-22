# Report subject prefill — 22 October 2026

Verified against the School database: all six groups initially had zero report subjects. Existing report UI supports manual subject creation, editing, validated teacher attribution and coefficients.

Applied `supabase/seed-industry-bulletin-subjects.sql` after a transaction-only dry run. Source is `docs/industry-planning-intake.json`, the existing provisional class-and-term planning. INDUSTRY P1 now contains 12 / 13 / 13 subjects for terms 1 / 2 / 3; P2 contains 13 / 13 / 13. Total 77. Lunch and free practice excluded. Teacher display names preserved when provided; unnamed teachers remain blank. Compound teaching labels are preserved exactly from planning. No teacher accounts or coefficients inferred. No grades or reports published. Existing rows are preserved on rerun.

This is provisional curriculum configuration, requiring administrative review before evaluations. Manual subject creation remains available. Existing deployed UI reads these database subjects without a frontend change.

Remaining: CORE requires reliable class-and-term teaching allocation; CORE open classes must not be used as the formation curriculum. The CORE P1 workbook was resolved but its text extraction returns no readable content; byte-level inspection remains necessary. INDUSTRY P3 has no confirmed curriculum in the intake. Link validated teacher accounts and confirm assessment coefficients. Run the first real teacher-to-direction-to-student acceptance journey after configuration.
