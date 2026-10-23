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

## Cockpit, locations de novembre et Instagram — 23 octobre 2026

Publication complète 6adb3b5dc395842caea02379 (379 fichiers, 9 règles de redirection sans erreur). Le cockpit est maintenant implémenté dans cette version : accès par la connexion School puis `/app/admin` pour les gestionnaires autorisés. Le calendrier public est `/locations-core.html` ; novembre est alimenté par la source de disponibilités validée, tandis que décembre reste non confirmé. Les deux comptes Instagram sont visibles sur le site et intégrés à l’accueil/profil de l’application.

Prévisualisation contrôlée avant publication : créneau libre Salle 1 à 10 h le 1er novembre, réservation fusionnée bloquée à 12 h, Salle 2 bloquée à 16 h, absence de disponibilité en décembre, liens sociaux et lien Louer un studio, vidéo native toujours chargée et muette. Contrôle du domaine officiel : calendrier chargé avec les données réelles et pied de page Instagram visible. Le cockpit sans session redirige vers `/app/login` après le parcours d’accueil. La lecture du cockpit a été vérifiée avec le rôle SQL authenticated et le contexte de Nicolas ; aucun login réel de direction n’a été simulé dans le navigateur.

Auto-publication rétablie après la publication. Les tests de l’interface utilisent des données fictives ; aucune modification de droits, compte, évaluation, justificatif ou décision d’absence n’a été effectuée. Stripe School reste à connecter. La capture `docs/assets/school-instagram-live.jpg` montre le pied de page en production. Le récapitulatif quotidien existant de Nicolas conserve son horaire de 9 h et utilise maintenant le domaine officiel et l’entrée du cockpit.

## Photos des studios — 23 octobre 2026

Ajout des trois photographies fournies par Vanessa via SwissTransfer (IMG_8535, IMG_8536, IMG_8537). Elles montrent des studios mais aucune correspondance campus/numéro de salle n'est confirmée : la galerie reste commune à la School et ne prétend pas identifier une salle à réserver.

Les JPEG originaux de 640 × 480 sont conservés sans recompression ni agrandissement : 154 553 octets au total. Dimensions explicites, chargement différé et décodage asynchrone ; trois colonnes sur grand écran, une sur mobile. Les images restent entièrement visibles, sans recadrage. Un lien permet d'ouvrir chaque photo dans sa taille originale. Aucun GPS dans les métadonnées source.

Reproduction : `python scripts/package-school-studio-photos.py ARCHIVE_PRODUCTION_COMPLETE.zip SORTIE.zip`. La base utilisée est le déploiement complet 6adb3b5dc395842caea02379. Seul index.html change parmi les fichiers existants ; ajout du bundle public, du CSS et des trois images. Tous les fichiers /app, le cockpit, le calendrier et Instagram restent identiques.

Publication 6adb3fc9b5cd408f9ab01b1b : 384 fichiers, six fichiers nouveaux/modifiés. Vérification syntaxique du bundle et comparaison de l'archive réussies ; les trois images sont chargées en production avec naturalWidth=640 et naturalHeight=480. La navigation Les studios ouvre la nouvelle galerie. Capture : `docs/assets/school-studio-photos-live.jpg`.


## Première salve de vie de l’école — 23 octobre 2026

Vanessa confirme que les trois photographies de salles précédentes montrent CORE. La galerie des salles est identifiée CORE ; les numéros individuels restent inconnus. Les informations de salles sont conservées, mais le même ancien visuel n’est plus répété sous chaque accordéon : les trois vues CORE sont présentées dans leur galerie commune.

La nouvelle salve contient dix fichiers et neuf photographies distinctes. Le doublon ef826199 est exclu. Trois photos différentes illustrent le campus CORE, le planning et la formation. Six autres alimentent la galerie de la vie School : cours, précision du geste, cercle, coulisses, identité et détails. Aucun nom de personne, date ou numéro de salle n’est déduit pour les nouvelles scènes. L’illustration INDUSTRY reste indépendante en attendant les vrais visuels.

`website/school-photo-batch-01.json` conserve la sélection, les sources, empreintes et légendes FR/EN. `scripts/prepare-school-photo-batch.py` génère des WebP responsives (480, 960 et maximum 1600 px, sans agrandissement). Les originaux fournis restent intacts. Les neuf miniatures totalisent 171 020 octets ; l’ensemble des 27 variantes fait 1 974 808 octets. Les grands fichiers de la galerie ne se chargent qu’à la demande.

`school-life-gallery.js` ajoute une visionneuse modale native, avec précédent/suivant, flèches clavier, Échap, restitution du focus et du défilement, gestion des erreurs et protection contre les anciens chargements arrivant après un changement de photo. Les légendes, commandes et textes alternatifs suivent FR/EN. Grille de trois, deux ou une colonne selon la largeur. Aucun défilement automatique.

`python scripts/package-school-life-photos.py ARCHIVE_STUDIOS_COMPLETE.zip SORTIE.zip` prépare la version complète. Seul index.html change parmi les anciens fichiers ; les fichiers /app, données, disponibilités et fonctions de paiement restent identiques. Syntaxe et présence de tous les nouveaux assets vérifiées ; le test de visionneuse passe (chargement à la demande, changement de photo, absence de remplacement par une ancienne réponse, fermeture et focus).

Prévisualisation puis publication 6adb432ce247fba54e2f7168 : 414 fichiers. Contrôles navigateur : six vues distinctes, chargement du grand format 1600 × 1066, commandes FR/EN, suivant/flèches clavier, Échap et retour du focus au bouton initial ; libellé des studios CORE confirmé.

Version finale 6adb457cbae6c61f2bb5fd56 : correction du seul grand format Le cercle, initialement incomplet. La préparation écrit désormais chaque image de façon atomique ; le packager vérifie taille, dimensions et décodage des 27 variantes avant publication. Les 27 fichiers ont été décodés depuis l’archive finale. Le grand format Le cercle a été chargé et vérifié en production (1600 × 1066). Capture finale : `docs/assets/school-life-gallery-live.jpg`. Auto-publication rétablie.


## Sélection complète des photos et contrôle des intervenants — 23 octobre 2026

Après réception de la dernière salve annoncée par Vanessa : 39 fichiers transmis, 36 photographies distinctes. Deux doublons ont les mêmes octets ; un troisième fichier diffère par ses métadonnées mais contient exactement les mêmes pixels RGB. Les originaux ne sont pas modifiés. La sélection et les empreintes sont dans `website/school-photo-selection.json` ; les dimensions et tailles des variantes sont dans `website/assets/school-life/complete-catalogue.json`.

Trois photographies différentes illustrent CORE, le planning et la formation. Les 33 autres sont réservées à la galerie : six vues initiales, puis 27 dans un bloc à ouvrir. Les 27 images supplémentaires ne reçoivent ni src ni srcset avant ouverture. Le grand format ne se charge qu’à l’ouverture de la visionneuse, qui permet de parcourir les 33 vues même si le bloc reste fermé. Les six miniatures initiales représentent 108 222 octets. Chaque photo a trois WebP, sans agrandissement ; toutes les 108 variantes ont été décodées depuis l’archive finale.

Préparation : `python scripts/prepare-school-photo-batch.py DOSSIER_ORIGINAUX --manifest website/school-photo-selection.json --catalogue website/assets/school-life/complete-catalogue.json`. Mise en archive depuis la version complète précédemment publiée : `python scripts/package-school-life-photos.py ARCHIVE_COMPLETE.zip SORTIE.zip --catalogue website/assets/school-life/complete-catalogue.json --previous-catalogue website/assets/school-life/catalogue.json`. Les écritures d’images et de ZIP sont atomiques.

La prévisualisation 6adb4b2b5b47b9ce3a6766c7 a confirmé les 33 photos, 27 miniatures sans source avant ouverture puis chargées au toggle, le passage 1/33 → 33/33, le grand format 1600 × 1066, Échap, restitution du focus et les libellés FR/EN. Test DOM de visionneuse et vérification de syntaxe réussis.

Le contrôle supplémentaire des intervenants est documenté dans `docs/school-teacher-visual-review.md`. À la demande de Vanessa, l’affiche incorrecte de Meech est retirée de la sélection publique en attendant son remplacement ; sa discipline Hip-Hop reste correcte dans le planning. Ashley est présentée en Heels / Techniques académiques selon les documents reçus. Les 19 affiches actives et leurs 57 variantes sont vérifiées sur le site et sa copie dans l’application intégrée ; trois dérivés incomplets ont été reconstruits. Le bundle Expo et les données métier restent identiques.

Publication finale : **6adb4d0758d705b921f38d63**, archive complète de 496 fichiers. Les neuf règles de redirection et la règle d’en-têtes sont acceptées sans erreur. Auto-publication rétablie. Contrôle sur le domaine officiel : galerie des intervenants INDUSTRY avec 19 fiches et absence de Meech. Le grand format réparé de Bruce charge en 1080 × 1350 dans la prévisualisation finale.

Visionneuse contrôlée en production : « Partager le mouvement », compteur 1/33, image chargée en 1600 × 1066. Capture : `docs/assets/school-photo-selection-final.jpg`. Pour CORE, seules les affiches des cours open sont disponibles ; aucune série d’affiches de formation professionnelle CORE n’est présentée comme reçue.
