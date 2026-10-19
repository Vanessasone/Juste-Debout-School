# Booking and ranking access review — 19 October 2026

Applied schema-booking-ranking-access.sql to the dedicated School project only.

Booking RPC now locks the session and card rows, returns existing booked/attended reservations without another debit, and preserves no-charge waitlisting. Direct authenticated booking updates are revoked: there is no cancellation UI or refund workflow currently enabled. Future cancellation must use a checked transactional RPC rather than restoring unrestricted updates.

Student ranking rows and points are restricted by campus. Administrators retain access; legacy campus staff and enabled responsibility assignments can manage their campus. Teacher ranking visibility remains authenticated. ranking_add checks the target campus. No responsibility assignments were activated and no invitations sent.

Verified tests/booking-ranking-access.sql against production in a rolled-back transaction: repeated booking debits once, full-session waitlist does not debit, direct UPDATE denied, CORE responsibility can read/award CORE while INDUSTRY read/award denied. Temporary removal of the test actor admin role and temporary responsibility assignment were rolled back. No real credits or records changed. Concurrent load was not simulated; row locks implement serialization.

No frontend deployment required. Open class information-only behavior remains unchanged.
