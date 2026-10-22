# School function choice and access requests

The web app now links to `/school-role.html` from home, profile and administration. After first onboarding, a signed-in account without a stored choice is directed to this screen. The choice is stored per account, not per device. School uses only its dedicated backend and auth storage key.

Four choices: open classes, training student, teacher, team. A choice never grants a profile role or a training-group membership. Student identity and promotion matching keep the existing verification process.

Teacher and team applications are campus-specific. Email confirmation is required. Pending applications are idempotent; rejected applications can be resubmitted. Approved applications cannot be edited by applicants. Applicants can read only their own requests. Direct INSERT/UPDATE/DELETE on requests are not granted to clients.

Teacher review: central administrators, enabled Nicolas/Bruce responsibilities across campuses, enabled Rabah/Loïc responsibilities for their own campus. Jacky cannot validate teachers. Team applications require central administrators or enabled Nicolas/Bruce responsibilities. No self approval. Decisions are locked, timestamped and attributed to the reviewer. Optional decision notes are visible to applicants.

A teacher approval records a campus-scoped entitlement in the approved request. Class assignments, bulletin structure and publication remain separate pending the school's model. Team approval does not create an administrator role: responsibilities still require explicit linking to a verified School account. None of the five team accounts existed at the last check; prepared responsibilities remain disabled. Nicolas's prepared responsibility covers both schools.

Validation: `supabase/tests/school_access_requests.sql` runs synthetic identities and temporary responsibility bindings inside BEGIN/ROLLBACK. It covers student self approval, campus isolation, director vs team review, Jacky exclusion, Nicolas global scope, approval receipt, duplicate submission, rejected resubmission, and missing anonymous/direct write grants. All temporary data is rolled back.

Web build: use pinned @supabase/supabase-js 2.110.1 and esbuild 0.25.12 to bundle web-access/access.js into public/assets/school-access.js; config.js contains only the dedicated School public publishable key. Copy school-role.html and school-access.css into public. The existing static export includes the gate script and gate-only stylesheet; global portal CSS must not be included in the Expo shell. No native binary was rebuilt.
