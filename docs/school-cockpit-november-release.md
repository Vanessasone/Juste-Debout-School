# School cockpit and CORE November availability

The School application now opens `/app/admin` for authenticated School managers after login. Other members retain their own School space. The cockpit reads `jds_school_cockpit` on focus and filter changes, groups work by school and promotion, and separates decisions, missing information, review items and drafts. Each action opens the corresponding management page. No account, responsibility, evaluation, absence or warning is automatically approved. The existing four-director check still controls the teacher-ranking module.

The public `/locations-core.html` calendar reads sanitized availability through `jds_core_rental_public_month` and `jds_core_rental_public_day`. It has no access to renter identities, source text, documents, proofs or medical information. A mailto prepares a request; sending an email does not hold a room or confirm a booking. Dedicated School Stripe remains unconnected.

## November source

The read-only parser `scripts/read-core-rental-month.py` resolves merged cells and both reservation columns. Only explicitly blue, yellow or green cells with both columns empty are eligible. All red, unrecognised colours, text and numeric amounts block the complete merged interval. The sanitized source is `supabase/data/core-rental-2026-11.json`; the original workbook must never be committed or included in a web deployment.

The November 2026 source has 363 consolidated windows, including 482 eligible half-hour cells (241 hours). With one-hour windows starting every 30 minutes, it yields 314 possible starts across all three rooms. These starts overlap and must not be added as independent rental hours. A later dated course or manual occupation overrides source availability. Other months are not automatically opened; legacy calendar verification remains required.

Migration order: `schema-school-cockpit.sql`, `schema-core-rental-source.sql`, `schema-school-cockpit-private.sql`. Privileged implementations live outside the exposed API schema; public wrappers use invoker rights. The anonymous API returns only room identifiers, names, times, availability, verification status and indicative public prices.

## Validation and release

- TypeScript and Expo web export passed.
- UI tests cover the login gate, campus refresh, separation of drafts, restricted ranking module, available/blocked public slots and explicit email request status.
- Transactional database tests verify role checks, aggregated counts, privacy boundaries, merged bookings, new occupation precedence and unverified future months.
- All 314 November starts were compared with the parser output; the sets match exactly.
- Existing access, team activation and bulletin UI regression suites passed.

Instagram accounts are shared through `SchoolInstagram` on app home/profile, and present in the public site and rental calendar footers: CORE `jdschool`, INDUSTRY `jdschoolindustry`.

Build the public calendar with `npm run build:rental --prefix web-access`. Export Expo with base `/app`, then run `scripts/package-school-cockpit.py` using the complete optimized production archive and the fresh Expo export. The packager preserves the fast public galleries, adds both Instagram links and the rental route, checks ZIP integrity and publishes the result atomically. Partial website/app-release overlays are never deployable alone.
