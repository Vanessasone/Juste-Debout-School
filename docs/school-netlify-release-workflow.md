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

## Domaine officiel — 23 octobre 2026

Domaine canonique : https://www.juste-debout-school.com/ ; application Expo sous `/app`. OVH conserve les DNS : apex A 75.2.60.5, www CNAME justedeboutschool-site.netlify.app. Netlify vérifie les DNS et fournit le certificat Let's Encrypt pour apex et www ; apex redirige vers www.

`app.config.js` accepte SCHOOL_WEB_BASE_URL=/app pour les exports unifiés ; sans cette variable, les exports historiques restent à la racine. Les liens web d'authentification et de confidentialité suivent l'origine et la base Expo. Les scripts autonomes d'accès et bulletins prennent aussi en charge les deux bases. Tests DOM exécutés pour racine et /app ; TypeScript et export Expo web réussis.

Pour préparer l'archive : exporter Expo web avec SCHOOL_WEB_BASE_URL=/app et les variables publiques Supabase existantes, puis `python scripts/package-school-domain.py SITE_PRODUCTION.zip EXPORT_EXPO ARCHIVE.zip`. Utiliser le téléchargement complet du site publié pour conserver ses scripts, images et pages ; ne jamais publier `website/` ou `app-release/` seuls. Le script ajoute l'application, adapte les liens, conserve les images des galeries et place la réécriture /app avant le fallback du site. Il corrige aussi les références CSS dont le téléchargement Netlify a modifié la casse. Contrôle de l'archive finale : aucune ressource locale référencée dans les HTML ne manque.

Après vérification du déploiement préparé, publication du déploiement 6adb2b5f5c42408d8bb51835 (275 fichiers côté Netlify, 8 règles de redirection sans erreur). Vérifications navigateur : bouton Mon espace, accueil en trois étapes, connexion et page bulletins protégée. Vérifications HTTP : domaine officiel, application, pages autonomes et bundles. Aucune donnée métier n'a été modifiée pour ces contrôles.

Supabase Auth Site URL : https://www.juste-debout-school.com/app/. Ajout de deux retours exacts autorisés : cette URL et https://www.juste-debout-school.com/app/update-password. Ancienne règle Netlify conservée pour les liens et la version historiques. Enregistrement contrôlé après rechargement du tableau de bord. Aucun compte créé, aucun email de test envoyé.

L'ancien programme PDF WordPress n'est pas inclus dans l'archive du site. Son bouton invite désormais à demander le programme via le formulaire de contact, au lieu de promettre un téléchargement indisponible. Rétablir le PDF uniquement à réception du document original.

## Mobile : animation, images et accès — 23 octobre 2026

Corrections demandées : lancement automatique de l'animation, photographies plus rapides, et entrée Mon espace dans le menu mobile. La vidéo précédente était volontairement figée et cherchait une position en fonction du défilement, après téléchargement complet en blob. Remplacement du seul composant public par `website/runtime/school-hero.js` : vidéo native muette, autoplay, loop, playsInline, poster immédiat et commande pause/lecture ; préférence système de réduction des animations respectée avec lecture manuelle possible. Si le navigateur refuse l'autoplay, l'image demeure visible et le bouton permet de démarrer. La première vue ne nécessite plus deux écrans de défilement pour avancer l'animation.

Pipeline reproductible pour la base complète 6adb2c934c6b8eb8a7c449e8 : `python scripts/optimize-school-public.py BASE.zip SORTIE.zip --cache CACHE_MEDIA`. Nécessite Pillow et ffmpeg. Le script refuse une structure de bundle différente avant de publier. Il conserve les fichiers existants et ajoute les nouvelles ressources ; les noms du nouveau bundle sont basés sur son contenu.

Miniatures CORE : 6 305 837 → 993 654 octets (-84,2 %) pour les 26 affiches ; seuls les 7 visuels du carrousel visibles/requis portent une source. Images plus grandes pour les fiches et affiches. Miniatures INDUSTRY : -43,8 % au total ; réparation du visuel Quentin dont la miniature précédente était vide. Galerie INDUSTRY différée jusqu'à proximité de l'écran. Vidéo bureau : 6 015 288 → 1 736 042 octets ; mobile : 1 998 931 → 829 336 octets (-58,5 %), H.264 sans piste audio et métadonnées faststart.

Ajout explicite de Mon espace/My account au menu React, avec fermeture du menu à la navigation. Texte du raccourci d'en-tête également conservé sur mobile. CSS mobile limité au site vitrine.

Validation : `node tests/school-hero.cjs` (autoplay natif, source mobile/bureau, poster, pause/reprise, refus d'autoplay, préférence de mouvement et nettoyage). Syntaxe JavaScript de tous les fichiers modifiés contrôlée. Aucun asset local des pages HTML ne manque. Vérification navigateur sur prévisualisation 6adb300a3379a1a085169c4f en iframe de même origine de 390 × 844 : vidéo en lecture, currentTime > 0, scrollY = 0 ; Mon espace présent dans le menu et navigation vers l'accueil de l'application. Vérification bureau : vidéo en lecture ; visuel suivant CORE chargé en WebP 480. Les fichiers d'application sont identiques octet pour octet sauf le script de galerie publique et son catalogue de miniatures ; aucun droit, compte, note ou justificatif n'est modifié.

La page de test __qa-mobile.html n'est présente que dans la prévisualisation de contrôle, jamais dans l'archive destinée à la production. Le cockpit de Nicolas fait l'objet d'une proposition fonctionnelle séparée ; il n'est pas implémenté par cette publication.

Archive finale de production : 6adb30f8d80dc77afdc682ca ; même contenu testé, sans la page de contrôle mobile.
