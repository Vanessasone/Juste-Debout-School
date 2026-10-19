# CORE public/private calendar alignment — 19 October 2026

Public static page public/calendrier-core.html contains seven programme entries selected from the school annual calendar: five Junior Dance Camps, Deep House Mission and JD School on Stage. Public availability, venue, admission conditions and pricing are not established by the supplied calendar and are explicitly subject to school confirmation. No ticketing or booking controls added. Internal exams, jury meetings, assessments, stage-report presentations and uncertain JD WEEK dates remain private.

Four CORE vocational-training holiday ranges are presented with the source's provisional status: 24 Oct–1 Nov 2026, 19 Dec 2026–3 Jan 2027, 27 Feb–14 Mar 2027, 10–25 Apr 2027. These dates do not imply open-class, camp or studio closure. INDUSTRY dates are not confirmed and were not changed.

Application: one private holiday information announcement for each CORE cohort, seeded idempotently by seed-core-holidays-information.sql. Existing 23 annual event announcements per CORE cohort remain available. Existing globally shared jds_training_periods records remain unpublished: publishing them without a campus field would improperly apply CORE dates to INDUSTRY and change automatic lesson-generation exclusions. This delivery publishes information, not automatic scheduling or closure rules.

Netlify static site release: school-core-calendar-site-20261019.zip, based on previous Industry site release with existing assets unchanged, adds the CORE page and discoverable entry link. Existing private app content updates immediately without a bundle release. No Higgsfield redeploy attempted because its brand-authorization scan remains blocked. No notifications, invitations or payments triggered.
