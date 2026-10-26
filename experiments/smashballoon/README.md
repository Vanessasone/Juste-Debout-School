# CORE Instagram — essai Smash Balloon

Essai isolé du 26 octobre 2026. Aucun fichier du site public n’est remplacé et aucun compte Instagram, abonnement ou licence payante n’est activé par ces scripts.

## Résultat observé

Les 12 contrôles HTTP/PHP ont réussi : WordPress 7.1.3, PHP 8.3.33 et Instagram Feed gratuit 6.14.0. Le shortcode officiel s’exécute et ses fichiers CSS/JS répondent en HTTP 200. Le pont retourne un état indisponible honnête avant connexion, autorise uniquement l’origine School prévue et conserve la protection de la page de connexion WordPress.

Le navigateur de test n’était pas disponible : le rendu réel dans une iframe, la hauteur responsive, le mobile et la lightbox restent à vérifier. La version Pro, la connexion Instagram, les publications et leur renouvellement automatique n’ont pas été testés. Ce résultat ne constitue pas une validation de production.

## Architecture à évaluer

Le plugin officiel fonctionne dans un WordPress compagnon. Seule sa page publique de fil est intégrée dans une iframe sur le site Netlify existant. Il s’agit d’une intégration personnalisée, pas d’une prise en charge native de Netlify par Smash Balloon. Les anciennes versions PHP autonomes ne sont plus maintenues.

- `wordpress/jds-core-feed.php` : plugin expérimental exposant `/?school-core-feed=1`. Sans identifiant de fil configuré, réponse 503 avec message d’attente explicite.
- `parent-bridge.js` : montage optionnel de l’iframe dans une zone choisie du site, avec contrôle de l’origine et de la fenêtre émettrice avant ajustement de hauteur. Ne pas inclure tant que l’adresse WordPress réelle n’est pas connue.
- `test-integration.mjs` : vrai WordPress et vrai plugin gratuit dans WordPress Playground CLI ; requêtes HTTP anonymes, activation et chargement des fichiers du plugin. Un identifiant volontairement inexistant sert à vérifier l’exécution du shortcode, sans inventer de publications.
- `test-results.json` : résultats effectifs et limites du test, générés après réussite.

## Reproduire

Node 24.22.1 utilisé. Dans ce dossier, installer les dépendances avec `npm ci`. Télécharger puis décompresser l’archive officielle :

https://downloads.wordpress.org/plugin/instagram-feed.6.14.0.zip

SHA-256 de l’archive testée : `53cae8ddb5e10a1cd715eaa785a7688e397107cd9edcddca120970c4dd9320f8`.

Puis lancer, en remplaçant le chemin par celui du dossier extrait :

```sh
SMASHBALLOON_PLUGIN_DIR=/chemin/instagram-feed npm test
```

Le test démarre un WordPress temporaire sur le port 9431, utilise PHP 8.3 / WordPress 7.1.3 et arrête le serveur à la fin. Aucun hébergement permanent n’est créé.

## Avant une intégration réelle

1. Identifier le WordPress existant ou l’hébergement PHP/WordPress disponible. Vérifier la licence réellement achetée et installer sa version officielle via l’espace du titulaire, sans transmettre de clé dans le chat.
2. Le titulaire du compte Instagram CORE réalise lui-même la connexion autorisée dans Smash Balloon ; créer le fil, choisir 6 publications et la grille adaptée.
3. Configurer côté administration WordPress l’option `jds_core_feed_id` avec l’identifiant de ce fil. La personne qui configure les permissions/cookies/consentement doit vérifier le fonctionnement dans une iframe et selon les choix des visiteurs.
4. Installer le pont uniquement sur ce WordPress, à l’adresse publique HTTPS retenue. L’origine parente autorisée est par défaut `https://www.juste-debout-school.com`. Vérifier que l’hébergeur/CDN n’ajoute pas une interdiction d’iframe ; ne pas supprimer les protections des pages de connexion ou d’administration.
5. Tester dans un navigateur sur ordinateur et iPhone : vraies publications, rendu et hauteur, consentement et cookies, liens, reels et éventuelle lightbox. La lightbox peut être limitée à la surface de l’iframe ; ce point n’est pas validé.
6. Vérifier le rafraîchissement automatique sur l’hébergement permanent, y compris WP-Cron et cache. La périodicité n’est pas promise par cet essai.
7. Seulement après ces vérifications, intégrer le module dans la page CORE et publier la version complète du site.

Aucun secret Instagram ou de licence n’est placé dans le JavaScript du site parent. L’iframe charge néanmoins les sorties du plugin officiel : vérifier la version payante et sa configuration réelles avant publication.

## Sources officielles

- Smash Balloon : [fin des anciennes versions PHP autonomes](https://smashballoon.com/doc/standalone-versions-discontinued/).
- WordPress : [plugin Instagram Feed](https://wordpress.org/plugins/instagram-feed/).
- WordPress : [API programmatique de Playground CLI](https://developer.wordpress.org/playground/handbook/guides/programmatic-playground-cli/).
