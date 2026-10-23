# Shared JD Galaxy — 23 October 2026

Published on the official School site https://www.juste-debout-school.com/ through the existing Netlify project justedeboutschool-site.

Production deploy: 6adbad89fa0c266e6dea33e7, verified Currently published at 20:55 Europe/Paris. Auto publishing was already on (restored with Vanessa's approval in the Nicolas thread); its setting was not changed in this release.

Base: the complete 514-file production archive school-import-production.zip, whose publication as 6adba9e8ff653a9d62b85146 is recorded in docs/school-finance-import.md in the Nicolas checkout. This includes the latest finance import module. Used scripts/package-school-galaxy.py to add the shared loader to 21 HTML pages; every non-HTML byte and all archive names were verified unchanged, including the Expo app, finance scripts, photos, redirects and headers. Never deploy website/ or app-release/ alone.

Shared source: https://www.juste-debout.com/galaxy/widget.js with data-current=school. Full section before the marketing homepage footer; discreet launcher elsewhere. No student/account data is sent to the shared component. Main shared v39 includes the mobile globe proportions correction, original artwork and independent animated surfaces.

Live browser acceptance: official homepage preserved CORE/INDUSTRY navigation, teacher catalogue and photos; floating launcher opened the six native destinations and the SCHOOL current-location marker. Direct private finance import page still requires School sign-in. No account, payment or student record changed.

Future complete-archive overlays must start from this release or a newer complete production archive to retain the Galaxy. The source website pages and app shell already include the loader. The private standalone app pages are included by the complete-archive injection.
