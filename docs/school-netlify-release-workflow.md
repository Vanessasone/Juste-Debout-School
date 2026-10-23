# School production publication — 22 October 2026

Published the tested teacher catalogue/removal interface on https://justedeboutschoolapp.netlify.app using the existing signed-in Netlify browser dashboard, team Vanessa, project justedeboutschoolapp. No account connection or hosting change was required.

This project deploys through Netlify Drop; pushing main does not publish it. The repository app-release directory is only a partial overlay and must never be uploaded alone as the complete app.

Reproducible procedure: open the project Deploys page; open the currently published production deploy; Options > Download deployed files prepares the archive, then the menu changes to Click to download files. Download the complete archive. Replace only assets/bulletins.js with the tested public/assets/bulletins.js bundle. Confirm every other archive entry and byte is unchanged. Upload the complete zip using browse files to upload in this existing project's Deploys page. Auto publishing is enabled; confirm Currently published before finishing.

This release preserved all 165 other archive entries, including the Expo entry bundle, fonts, images, HTML and redirect rule. Published at 4:28 PM as displayed by Netlify. The served /assets/bulletins.js SHA-256 matches the tested build: f4a2d34504a361277aee9abd20a0b6ad14cff269f2b6b04155128a98f78887d1. HTTP 200, catalogue and removal/restoration RPC strings confirmed. Live /bulletins.html correctly requires School login; no real student grade or report was created or published. Separate authenticated teacher/admin/student browser acceptance remains pending designated logins.

Do not store tokens or private credentials in this document. The browser dashboard supplies the existing authorized account session.


## Coefficients — 23 October 2026

User explicitly approved publication. Updated main through the connected GitHub API after the shell transport lacked credentials. Code commit c6783bb037eed0efe6dd596a8a26bfdd1da210d9 has tree 069e11b8930b840658ca2a38f24afd2ea433b59a, identical to the locally tested implementation.

After secure Netlify Google sign-in, downloaded published deploy 6ada871cf0d3411ddc18bcbf. Its assets/bulletins.js matched the prior repository build. Replaced only that asset in the full ZIP; all 106 other archive entries and their bytes were preserved. Uploaded through the existing School project's Deploys page. Published deploy 6adb17a5fb09fac9d2c4a146 at 10:15 Europe/Paris: one new asset, redirect rule processed without errors.

Verified public served bundle byte-for-byte against the tested build: SHA-256 597ae0ac2587f074891f68f508456482f15806764731e12a497f30874c7e811f. /bulletins.html loads and enforces School sign-in. No real evaluation, report, access approval or absence decision was created by publication. Course counts and ambiguous module categories remain for administration to confirm; interactive acceptance in a real admin session remains pending.
