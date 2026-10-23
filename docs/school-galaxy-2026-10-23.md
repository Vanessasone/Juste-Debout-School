# Shared JD Galaxy — 23 October 2026

Prepared shared navigation on public HTML sources and the app shell, using the main site's exact Earth and six animated planets. Full section only on the marketing homepage; discreet launcher elsewhere. Source centralised at https://www.juste-debout.com/galaxy/widget.js ; no account or student data passed.

School production download failed twice through the existing Netlify dashboard. The currently published and locked deploy observed was 6adb7124a4b96f6a0fe38a3e (508 files); a newer completed draft 6adba2c4b350e9e6908ada79 also exists. No lock was lifted and no draft or partial overlay was published. Neither existing version was overwritten.

To publish, download the intended complete current production archive and run python scripts/package-school-galaxy.py INPUT.zip OUTPUT.zip. The helper changes only HTML, keeps all archive names, verifies every other byte, and refuses a partial archive. Upload OUTPUT.zip to the existing School project, review and publish explicitly while preserving the existing deployment lock policy. Rebase on the latest publication if it changed meanwhile.

Main shared component and schedule were published on Juste Debout main v38. Billetterie and Partners publication were separately verified READY. School publication remains pending until a complete current archive can be retrieved.
