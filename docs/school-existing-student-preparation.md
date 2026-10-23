# Existing student dossier preparation

Requested by Vanessa: reduce Nicolas's work by preparing existing student dossiers using available verified-source records, while retaining human review of actual accuracy.

Executed `scripts/sql/prepare-existing-school-dossiers.sql` against the dedicated School project. The script attributes this administrative preparation to the verified existing Vanessa School author, not Nicolas. It creates only missing records and records an explicit source and preparation event. First ran with rollback; then committed; reran with rollback and verified zero new records (idempotent).

Result: 75 draft admission dossiers, 73 emails, 72 phones copied from the existing private directory, linked to the existing membership/group records. Names, campus, promotion and season continue to use these authoritative existing relations. Six draft promotion configurations have their training titles filled; official terms, dates, prices and document requirements remain unconfirmed and blank where unknown. Two missing email addresses and three missing phone fields are listed by student in one private director task. Original source dates of birth and dossier codes stay in the private directory and were not duplicated into unsupported form fields.

| Campus | Promotion | Dossiers | Emails | Phones |
| --- | --- | ---: | ---: | ---: |
| CORE | P1 | 19 | 18 | 16 |
| CORE | P2 | 8 | 8 | 8 |
| CORE | P3 | 8 | 7 | 8 |
| INDUSTRY | P1 | 31 | 31 | 31 |
| INDUSTRY | P2 | 8 | 8 | 8 |
| INDUSTRY | P3 | 1 | 1 | 1 |

All 75 dossiers remain drafts, with no invitation tokens, admission confirmation, validated status or account activation. Prepared drafts with missing email use an empty target address; the existing issue action independently requires a valid directory email, confirmed rules and finances before it can generate an invitation. No monetary amount, payment, discount or aid was inferred. No empty tuition accounts were created: doing so would block the current import tool's protection against overwriting an existing financial dossier. The finance import/manual-entry flow remains available for the actual historical financial source.

No public bundle or deployment changed; these records are immediately available in the existing protected admission workspace. No student contacts or private source documents are stored in this repository. Final aggregate database verification: 75 drafts, 72 populated phones, 75 preparation audit events, 0 invitation tokens, 0 confirmed promotion configurations and 0 tuition accounts.
