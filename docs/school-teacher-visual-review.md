# Vérification des disciplines publiques — 23 octobre 2026

Périmètre : 26 affiches CORE (28 créneaux, 25 noms/groupes distincts) et les 20 affiches INDUSTRY reçues. Comparaison visuelle des affiches originales avec les noms et styles affichés ; confrontation des intervenants INDUSTRY aux emplois du temps P1 et P2 2026–2027 fournis par Vanessa. Les emplois du temps ne sont pas une liste exhaustive de toutes les compétences d’un intervenant.

## Corrections

- **Meech : Hip-Hop.** Confirmé explicitement par Vanessa et par les deux plannings, aux trois trimestres. L’affiche fournie porte à tort « Heels ». À la demande de Vanessa, cette affiche est retirée des deux catalogues publics, du carrousel et de la grille, en attendant un original corrigé. Le script historique de préparation exclut également Meech pour éviter sa réintroduction lors d’une régénération. Sa discipline correcte et les créneaux de formation ne sont pas supprimés.
- **Ashley Khelif : Heels / Techniques académiques.** Heels sur l’affiche reçue ; techniques académiques dans le planning P1, trimestre 3. Les deux sont indiqués, sans remplacer une compétence par l’autre.
- **Loriane : Heels / Techniques académiques.** Déjà correctement renseigné : affiche Heels ; techniques académiques en P1 T1/T2 et Heels en P1 T3.

## Autres fiches INDUSTRY contrôlées

| Intervenant | Discipline affichée | Vérification |
| --- | --- | --- |
| Amélie | Techniques académiques | Affiche et P2 |
| Bruce Ykanji | Popping / Hip-Hop | Affiche |
| Creesto | Popping | Affiche et P2 |
| Enzo Hacini | Heels | Affiche et P2 T3 |
| Joël Tenda | Ndombolo | Affiche et P1 T2 |
| Loïc | Locking | Affiche et P2 |
| Marie Mwiza Ndutiye | Yoga | Affiche ; pas de rapprochement automatique avec le nom « Marie Ninja » du planning |
| Mélissa Fromentin | Street Jazz | Affiche et P1 T3 / P2 T2 |
| Michmich | Urban contemporain | Affiche et P1 T1 / P2 T3 |
| P.lock | Locking | Affiche et P1 |
| Queensy | Dancehall | Affiche et P1 T1 / P2 T3 |
| Quentin | Modern | Affiche et P1 |
| Rickysoul | House Dance | Affiche ; planning P1 indique RICKY |
| ULIJEN | House Choreo | Affiche ; pas de fusion automatique avec « JULIEN » du planning |
| Vision | Électro | Affiche et P1 T1 / P2 T2 |
| William | Coaching physique | Affiche et P1 T1 / P2 T1 |
| Xtana | Afro House | Affiche et P2 T1 |

Les 26 affiches CORE correspondent aux styles du catalogue public. Kota a deux affiches et deux styles distincts : Locking et Popping. Ces deux cours sont conservés. Les créneaux enfants Iony et Camilla partagent chacun leur affiche ; ils ne sont pas considérés comme des professeurs différents.

Sources : « JD INDUSTRY 1ERE 26_27-2.pdf », pages 1–2 ; « JD INDUSTRY 2eme 26_27 -2.pdf », pages 1–2 ; affiches originales CORE et INDUSTRY fournies par l’école. Aucun nom de personne n’est déduit d’une photographie. Aucune fiche privée, note ou appréciation n’est publiée.

## Vérification technique

Le catalogue INDUSTRY public compte désormais 19 visuels. Les fichiers originaux restent intacts. Trois dérivés incomplets ont été reconstruits à partir des PNG : Bruce et Michmich en 1080 px, Quentin en 640 px. Les 57 variantes actives sont décodées pour le site et pour son application intégrée. Les ressources mises à jour utilisent une version de cache explicite.

Reproduction : `python scripts/package-school-teacher-review.py ARCHIVE_SCHOOL_COMPLETE.zip SORTIE.zip`. Le script applique les catalogues contrôlés, les scripts et le cache aux deux surfaces ; il conserve l’application, ses données et ses droits.


## Ancienne adresse de l’application — contrôle complémentaire

L’ancienne adresse `justedeboutschoolapp.netlify.app` conservait le catalogue de 20 fiches, dont Meech. Le contrôle de sa grille a aussi montré 20 miniatures sans image décodée. La publication en place restait 6adb17a5fb09fac9d2c4a146, correspondant à l’archive complète des coefficients conservée dans la session.

Une nouvelle archive historique reprend exactement cette base et les deux catalogues vérifiés de 19 fiches. Les 76 fichiers de médias publics manquants (PNG et variantes WebP) sont restaurés depuis la publication officielle déjà contrôlée. Aucun visuel de Meech n’est ajouté. Les ressources de galerie sont versionnées pour actualiser le cache. Les fichiers Expo, le bundle des bulletins, les droits, l’authentification et les redirections sont inchangés.

Le packager accepte maintenant les bases avec ou sans préfixe `/app` ; il ne réécrit les sources HTML locales que sur demande explicite, afin qu’une mise à jour de l’ancienne application ne remplace jamais les sources du site officiel. La restauration des médias n’accepte que les affiches présentes dans les catalogues vérifiés et décode chaque fichier.

Commande : `python scripts/package-school-teacher-review.py ARCHIVE_HISTORIQUE_COMPLETE.zip SORTIE.zip --media-archive ARCHIVE_OFFICIELLE_VERIFIEE.zip`. Comparaison de tous les fichiers existants et décodage des 19 grands formats et miniatures réussis.

Publication de l’ancienne application : **6adb517945e454e4a0f30a04**, 163 fichiers servis. Règle de redirection acceptée sans erreur. Prévisualisation : 19 fiches, aucune fiche Meech, Ashley en Heels / Techniques académiques ; miniature Quentin en 640 px et grand format Michmich en 1080 × 1350.

Contrôle en production après rechargement : 19 fiches, aucune fiche Meech, cinq affiches du carrousel chargées en 640 px. Auto-publication rétablie. Capture : `docs/assets/school-legacy-posters-restored.jpg`. Le domaine officiel et sa galerie de 33 photographies ne sont pas republiés par cette correction historique.
