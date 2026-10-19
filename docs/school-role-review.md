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

## Authenticated browser checks — 19 October 2026, evening

Vanessa signed in through the secure browser credential interface. Verified live home greeting Vanessa and Administration School entry; opened administration then Formation & promotions; all six promotion selectors loaded. INDUSTRY P1 and P2 each displayed the three published provisional timetable announcements. No student record edited.

Verified edit-profile loaded Vanessa's saved presentation fields and both return controls; used the lower Return to profile and confirmed profile name/city after loading. Planning tab loaded, INDUSTRY selection showed its provisional programme. Wednesday filter showed the three expected slots (Tarik kids, Tarik teens, Cristian reggaeton). Opened My training; account correctly had no promotion membership and showed the explanatory state and open-class link; returned to profile successfully. No save, upload, attendance or publication mutation performed.

Separate student/teacher/manager browser logins still require designated test accounts. Their server authorization matrix passed earlier; that is distinct from these authenticated administrator navigation checks. Email delivery remains pending configuration.
