# Admission preparation overview

The protected enrollment workspace now labels draft dossiers as prefilled and awaiting review. For the selected promotion it shows roster count, draft count, invalid/missing email count and missing phone count from existing admission dossiers. Unknown phone values for members without dossiers are not counted as known missing values. Phone availability is informational and does not become a new invitation prerequisite.

Each draft lists its outstanding email, phone, common rules, financial conditions and schedule. Optional filters isolate missing emails, missing phones and incomplete financial conditions. Confirmed financial conditions require an active account; cancelled accounts cannot look ready. A dossier with known prerequisites still requires explicit admission confirmation and server checks before issuing a link. Submitted, invited and closed dossiers are not described as ready for their first invitation.

The selected promotion links directly to the finance importer, which now honors and validates the group query parameter against the live authorized roster/groups. Unknown groups reset to the chooser. No user access, data validation or financial record changed in this release. Existing phone snapshots stay in enrollment; students can confirm/update their phone during completion.

Validation: test-enrollment-readiness.cjs checks prerequisite combinations, missing data, closed workflow stages, cancelled finance and URL escaping. Enrollment DOM test checks the prefilled label, missing phone guidance and scoped link; importer DOM test starts directly at a selected group and checks download/save behavior. All pass, alongside the existing enrollment and importer assertions. These tests use synthetic data and mocked browser RPC calls. No authenticated live account was impersonated.

Packaging uses package-school-readiness.py against the full previous production archive, 6adbb483456e7b75681ebb93. Only enrollments.js, finance-import.js and the two HTML script cache keys change. Other content, media, Galaxy, task board and redirects remain byte-identical.

Published as 6adbb5e44d4d39e66be1d103, confirmed currently published in Netlify. Official enrollments.html still shows the School sign-in gate before private data. Screenshot: docs/assets/school-readiness-live.jpg. Authenticated visual testing remains pending with the real user; automated checks use mock RPC responses.
