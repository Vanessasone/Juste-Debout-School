# School privacy review — 19 October 2026

## Delivered
- Public static legal, privacy and local-storage notices in public/, available before authentication.
- Notices cover the School website and dedicated School application; independent Event/TOTF accounts.
- Links at login, profile and profile editor; account-closure mailto is explicitly a request, not deletion.
- Website contact form prepares a mailto locally; no form database or analytics pixel in the reviewed source.
- School Supabase audit: all 33 public tables have RLS enabled. Profiles read/update own rows; directory access is campus-scoped. The sole storage bucket is private school-training; avatar objects = 0.

## Items requiring school confirmation before official-domain launch
- Full publisher legal entity: legal form, registration/SIREN, registered office and any applicable VAT details. The old legal notice identifies only Juste Debout School and Bruce Soné, 3 rue de l’Est.
- Approve and implement a category-by-category retention schedule and periodic purge/archive workflow. The notice currently states purpose-based criteria; no automated deletion is claimed or configured.
- Confirm processor contracts, hosting regions, subprocessors and any international transfer guarantees with Netlify and Supabase. No assertion of France-only processing.
- Define responsibility for rights requests at contact@juste-debout.com, with verification, response and account-closure procedures. No requests were sent and no accounts deleted during this review.
- Inform people whose directory records were imported, including unlinked students, through the school’s approved communication channel. No invitation or bulk email was sent.
- Audit media permissions before enabling personal avatar uploads: the client still references an absent photos bucket; do not create a public bucket for personal photos.

## Technical follow-up
Supabase advisors returned no RLS-disabled table warning. They flagged nine authenticated SECURITY DEFINER RPCs and leaked-password protection disabled. These are follow-up review items, not proof of a data leak. RPC authorization must be reviewed before changing grants used by existing RLS policies.
https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Sources
- https://www.juste-debout-school.com/mentions-legales/ (identity only; obsolete legal text and former OVH/Sweet Punk details not copied as current hosting)
- https://www.cnil.fr/fr/informer-les-personnes
- https://www.cnil.fr/fr/cookies-et-autres-traceurs/que-dit-la-loi
- https://www.netlify.com/privacy/
- https://supabase.com/privacy

This review does not certify full legal compliance. Outstanding identity, retention and processor governance items require the school’s validation.
