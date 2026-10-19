# School access acceptance checks — 19 October 2026

Executed tests/school-role-matrix.sql on the dedicated School project. Seven actor states used a single existing administrator identity with transaction-local role, temporary membership and temporary responsibility changes. All changes and synthetic records rolled back. No credentials, sessions, invitations or real responsibility assignments created or enabled.

| Actor | Verified behavior |
| --- | --- |
| Student with a CORE membership | Only own group and published posts; own attendance only; no directory access; attendance update blocked; cannot promote own role |
| Teacher without group/responsibility assignment | No administration privilege; no training groups or private directory access |
| CORE manager | Three CORE groups; own-campus drafts and directory; own draft editable; other-campus draft hidden and update blocked; cannot change responsibility assignment |
| INDUSTRY manager | Same checks restricted to INDUSTRY |
| Global manager | Both campuses, six groups |
| Disabled manager | No training-group access |
| Administrator | Both campuses, six groups |

Existing profile, planning and check-in unit checks all passed. Final aggregate cleanup query confirmed zero test posts, people and responsibilities, zero real enabled responsibility assignments and administrator role restored.

Scope: these are actual PostgreSQL authorization checks under the authenticated database role, plus client-library regression tests. They do not replace browser sign-in journeys for separate users. Real email delivery/confirmation/reset awaits the mail configuration, and authenticated browser end-to-end testing remains to be completed with designated test accounts. No user-facing change required or published in this audit.
