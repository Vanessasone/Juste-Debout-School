# INDUSTRY formation visuals — 22 October 2026

Twenty original school-supplied 1080×1350 PNG posters, unchanged, archived as Library libfile_6cb204bc7a3c8191884a3be2858d939e. Originals are also served in /assets/industry-formation/ on the School site and app. Before using a fresh Expo export or recreating the site, populate public/assets/industry-formation/ from that archive according to catalogue.json. The names, disciplines and public poster files contain no private directory contacts.

Both Netlify releases are live: School site /industry-formation.html and School web app /industry-formation.html. Website homepage includes the formation carousel; Industry open page links to formation separately. The app export includes an additive script exposing the gallery link on /profile, /my-training and /planning. Auth and existing application bundle remain unchanged. Native binaries were not rebuilt. A future Expo rebuild must include the gallery script and stylesheet in its HTML shell, following website/app-shell-index.html.

20 visual cards and opening/closing the full-poster dialog verified on both live origins. Pause verified. Poster grid CSS explicitly sets height:auto to preserve 4:5 ratio. Image sample measured 278×348 pixels and successfully loaded. Reduced-motion support and dark/light theme implemented. No account, teacher review status, staff role, school calendar or private student data modified.

Missing visual files will be added when supplied; the school is described as opening in preparation. ULIJEN uses the exact stage name on the poster and was not automatically matched to private Julien contact.

## Nine additional teacher posters — 30 October 2026

Vanessa supplied SwissTransfer `01a1887b-2d74-70e4-9cde-e4fe2bbe1beb`: nine original 1080×1350 PNGs. Archived unchanged as Library `libfile_ebda974e4ca481918797c80d2438f979` (`transfer-01a1887b.zip`). Names and disciplines were read directly from the supplied posters: Hélène — Danse classique; JP Mano — Histoire de la musique; Maxime Garvi — Hip Hop Choreo; Meech — Hip Hop; Namu Serpentard — Beatmaking; Rabah Mahfoufi — House; Sofy — Chant; Victoria Prevel — Jazz; Yanou — Voguing. No face recognition or account matching performed.

The reviewed public catalogue grows from 19 to 28 unique entries, alphabetically ordered. Meech returns using the new correct Hip Hop poster. Eighteen WebP files (640/1080) preserve the complete 4:5 poster, with no crop or EXIF. All eighteen decode and aspect checks pass. The existing carousel, lazy image loading and full-poster dialog remain in use. Catalogue and script cache keys are refreshed in the public source and application-facing shell.

`package-school-industry-posters.py` overlays these public files on the COMPLETE current published archive, checks all 56 catalogue images, validates ZIP integrity and preserves every unrelated byte. Source deployment `6adf660e6f5655f9a134df5b`: 646 files; output: 662 files, 16 new paths (Meech paths already existed), 9 existing paths changed, 637 existing files identical. App entry changes only the INDUSTRY gallery cache key; private application code, PDFs, CORE, redirects and headers are preserved.

Production deployment `6ae46af466f84a23d1d2bfae` is currently published in the existing Netlify School project. Official `/industry-formation.html` browser verification lists all 28 entries including all nine new names and disciplines. No database, permissions, finances, planning or email changes were performed.
