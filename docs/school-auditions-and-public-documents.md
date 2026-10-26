# Auditions 2027 and public School documents

Prepared on 26 October 2026 for the existing official Netlify site. Scope: public website only; no app bundle, database record, role, financial dossier or invitation changes.

## Content

- Eight audition dates supplied by Vanessa: 15 March 2027 at 15:00; 10/24 April, 15/29 May, 12/26 June and 10 July 2027 at 13:00, Paris time. The explicit 15 March date is preserved; it is not silently changed to a Saturday based on the generic brochure wording.
- Homepage admission section in French and English, with a responsive date list and the existing enquiry flow. No audition registration or booking is claimed.
- Exact requested French link label: `lien pour télécharger la brochure et le certificat Qualiopi`. It opens the document section, which distinguishes supplied brochures from the still-missing certificate.
- Four byte-identical supplied PDFs under `website/documents/`: French 14-page and English 8-page training programmes; French and English 3-page studio rental rules. A PDF download link is added directly to the CORE rental page.
- Documents page accessible from the admission and open-class sections. It makes no false claim that the Qualiopi certificate or open-class rules are downloadable: both originals are still required. Existing contact actions are offered until the files are supplied.

## Instagram

Smash Balloon Instagram Feed is a WordPress plugin. The current public School site is a static React/Netlify deployment, so the plugin cannot simply be installed here. No unsupported embed, shortcode, secret, Instagram scraping, new service subscription or migration was added. Existing CORE/INDUSTRY Instagram links remain unchanged. An existing WordPress-hosted feed/embed or an explicitly selected compatible implementation is needed before activation.

Official vendor reference checked on 26 October 2026: https://smashballoon.com/instagram-feed/ (FAQ: non-WordPress platforms are not supported).

## Verification and packaging

`scripts/package-school-admissions-documents.py --prepare UPLOAD_DIRECTORY` copies the four supplied PDFs without modification and prepares the current public sources. JavaScript syntax and both language render trees were checked; all eight exact dates/hours and the required link wording were verified. PDF links resolve to the corresponding source files and their hashes match the uploads.

To publish, first download the COMPLETE CURRENT production archive from the existing Netlify project, then run:

```
python scripts/package-school-admissions-documents.py --source CURRENT_FULL_SITE.zip --output SCHOOL_AUDITIONS_DOCUMENTS.zip
```

The packager requires at least 400 entries, the existing app task page and redirects. It updates only index.html and locations-core.html among existing files, adds the new public bundle, CSS, document page and PDFs, and asserts every other existing byte is preserved, including all `/app`, photos, `_redirects` and `_headers`. Do not deploy `website/` or a partial overlay alone.

## Publication status

Not published. The Netlify dashboard required renewed sign-in. Vanessa selected Google in the secure method chooser. Google then offered a signed-out JD SCHOOL account (`nicolas.coordination@gmail.com`) or another account. Automatic approval review rejected the account-choice authentication step because use of that Nicolas-owned account was not explicitly authorized in this thread. No retry or alternative sign-in was attempted after rejection. Explicit authorization for the correct Netlify login is required to continue.

A visual browser acceptance check and verification of the full production archive remain pending that access. Local file preview was disallowed by the browser URL policy; no alternative browser mechanism was used to bypass it. Source-level checks passed and do not substitute for the remaining visual check.
