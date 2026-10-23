# CORE P1 — preparation for the first real dossier

## Completed technical verification

Re-ran `node test-enrollment.cjs`, `node test-tuition.cjs`, `node test-import.cjs` and `node test-tasks.cjs`: all passed. These verify the actual browser bundles with mocked network calls and synthetic identities. They are not a signed-in visual browser acceptance test.

Executed `supabase/tests/school_enrollment.sql` and `supabase/tests/school_tuition.sql` on the dedicated School project. Both complete successfully, including their final ROLLBACK. The enrollment transaction creates a synthetic CORE group and identities, configures rules, creates the financial dossier, issues and rotates an invitation, rejects the wrong recipient, claims as the expected student, requires supporting documents and acknowledgment, submits, and validates as direction. Private notes are excluded from the student response. Financial amendments reopen acknowledgment. Financial tests verify drafts, schedules, FIFO allocation, partial and excess receipts, immutable payment history, revision conflicts, access restrictions and safe Qonto URLs. No real student was enrolled, validated or activated by this test run.

The test tool reports the root Expo tsconfig base is unavailable in this standalone checkout. Bundling and all assertions succeed; a complete Expo build was not run.

## Human acceptance pending

A new priority-one task is seeded in the existing protected Nicolas workspace, separate from technical completion, with this checklist:

1. Confirm CORE P1 enrollment rules and required documents.
2. Choose the first real student and verify the recipient address.
3. Enter or import their actual price, aid, schedule and verified receipts.
4. Review and validate the proposals.
5. Generate the personal invitation and transmit it deliberately.
6. Have the student complete and submit the dossier.
7. Review documents and validate; control identity and linking before the separate access activation.
8. Review both real account screens together before extending to the promotion.

The task remains **to do**. No invitation email has been sent. Qonto remains disconnected. The signed-in visual acceptance and financial source confirmation require the actual account holders; the successful automated checks do not substitute for those steps. No production bundle changed in this verification pass.
