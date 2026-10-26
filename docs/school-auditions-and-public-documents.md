# Auditions 2027 and public School documents

Prepared on 26 October 2026 for the existing official Netlify site. Scope: public website only; no app bundle, database record, role, financial dossier or invitation changes.

## Content

- Eight audition dates supplied by Vanessa: 15 March 2027 at 15:00; 10/24 April, 15/29 May, 12/26 June and 10 July 2027 at 13:00, Paris time. The explicit 15 March date is preserved; it is not silently changed to a Saturday based on the generic brochure wording.
- Homepage admission section in French and English, with a responsive date list and the existing enquiry flow. No audition registration or booking is claimed.
- Exact requested French link label: `lien pour télécharger la brochure et le certificat Qualiopi`. It opens the document section, which includes the original French programme containing the certificate on page 9.
- Five byte-identical supplied PDFs under `website/documents/`: French 14-page and English 8-page training programmes; French and English 3-page studio rental rules; the 1-page French open-class and workshop tariff sheet supplied afterwards. A PDF download link is added directly to the CORE rental page.
- Documents page accessible from the admission and open-class sections. The Qualiopi certificate is a scanned page in the French programme (page 9); the page offers opening that original at page 9 and downloading the complete original without alteration. The full open-class regulations remain distinct from the supplied tariff/card-conditions sheet and are still required.

## Instagram

Smash Balloon Instagram Feed is a WordPress plugin. The current public School site is a static React/Netlify deployment, so the plugin cannot simply be installed here. No unsupported embed, shortcode, secret, Instagram scraping, new service subscription or migration was added. Existing CORE/INDUSTRY Instagram links remain unchanged. An existing WordPress-hosted feed/embed or an explicitly selected compatible implementation is needed before activation.

Official vendor reference checked on 26 October 2026: https://smashballoon.com/instagram-feed/ (FAQ: non-WordPress platforms are not supported).

## Verification and packaging

`scripts/package-school-admissions-documents.py --prepare UPLOAD_DIRECTORY` copies the five supplied PDFs without modification and prepares the current public sources. JavaScript syntax and both language render trees were checked; all eight exact dates/hours and the required link wording were verified. PDF links resolve to the corresponding source files and their hashes match the uploads.

To publish, first download the COMPLETE CURRENT production archive from the existing Netlify project, then run:

```
python scripts/package-school-admissions-documents.py --source CURRENT_FULL_SITE.zip --output SCHOOL_AUDITIONS_DOCUMENTS.zip
```

The packager requires at least 400 entries, the existing app task page and redirects. It updates only index.html and locations-core.html among existing files, adds the new public bundle, CSS, document page and PDFs, and asserts every other existing byte is preserved, including all `/app`, photos, `_redirects` and `_headers`. Do not deploy `website/` or a partial overlay alone.

## Publication status

Not published. Vanessa explicitly identified and authorized her own Google account contact@vanysweddings.com for Netlify. Secure Google sign-in and two-step verification completed; after an expired OAuth state was renewed once, the Netlify dashboard positively showed that account in the Vanessa team. No Nicolas account was used.

The current production deployment is 6adbd460696aec9819b2beaf (519 files). Netlify reports that the team has exhausted deployment credits for this billing cycle: production deploys and Agent Runners are paused, while published sites remain online on operational credits. No credit purchase, plan change or billing setting change was made. Publication remains blocked until the account holder replenishes eligible credits or the billing cycle renews.

The open-class tariff PDF is offered as tariffs and card conditions, not mislabeled as the full open-class regulations. The full open-class regulations remain missing; the Qualiopi certificate has been visually verified on page 9 of the French programme. No real enrollment, rental or payment transaction is triggered by the public document updates.

A visual browser acceptance check of the new public presentation remains pending publication access. Local file preview was disallowed by the browser URL policy; no alternative browser mechanism was used to bypass it. Source-level checks passed and do not substitute for the remaining visual check.

## Credit requirement verified in the account

The team is on Personal. The billing page showed 6.7 remaining plan credits and 61.5 operational credits, with production paused; operational credits cannot fund deployments. The smallest one-time pack offered in the account is 500 credits for USD 5.00. The purchase dialog was inspected and cancelled without purchase or automatic recharge. Monthly credits reset on 29 October 2026. The vendor currently charges 15 credits per production deploy. One pack is sufficient for this update but is shared across the team's sites and also funds metered traffic.

The dashboard generated a download result for the current production archive, but the reported file was absent from the browser and shared files after the synchronization check. The complete archive could not be packaged in this attempt; no partial site archive was published. Source changes are saved independently of that failed download.
