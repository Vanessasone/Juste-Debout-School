# Bulletins School — 22 octobre 2026

Entrée : `/bulletins.html`, lien depuis Ma fonction / Mes accès et raccourci de l’accueil, du profil et de l’administration.

## Mise en route par la team
1. Valider les demandes de fonction professeur pour le bon campus.
2. Dans Bulletins, choisir la classe et le trimestre, puis Configurer les matières. Renseigner l’intitulé, le professeur validé, le nom affiché et les deux coefficients. Aucun coefficient ni affectation n’est déduit de la liste PROFS du modèle.
3. Les professeurs saisissent les notes CC sur 5 (séparées par point-virgule), les évaluations sur 20 et l’appréciation. Enregistrer conserve un brouillon ; Transmettre le verrouille côté professeur. L’administration peut rouvrir le brouillon.
4. Vérifier la synthèse et les nombres d’absences, y compris 0 si aucune. Les absences restent manuelles tant que les périodes et les présences ne sont pas complètes.
5. Vérifier le bulletin complet et lire l’aperçu PDF. La direction publie seulement après contrôle. L’élève rattaché retrouve le PDF dans Mes bulletins ; une notification individuelle est créée et signalée par le raccourci Bulletins.
6. Après publication, les corrections produisent une nouvelle version avec un motif. Les anciennes versions restent consultables et ne sont jamais réécrites.

## Droits
- Nicolas, Bruce et les administrateurs globaux : toutes les écoles, configuration, préparation et publication.
- Rabah : CORE ; Loïc : INDUSTRY ; configuration, préparation et publication de leur école lorsque leur responsabilité est activée.
- Jacky : préparation INDUSTRY ; pas de publication.
- Professeur : demande approuvée et matière explicitement attribuée ; uniquement ses matières/classes/trimestres. Pas de synthèse ni de bulletin final des autres matières.
- Élève : uniquement ses versions publiées après rattachement validé.
- Compte non connecté : aucune donnée pédagogique.

Les responsabilités préparées sans compte activé ne donnent aucun droit. Aucun nouveau compte n’est créé par le module.

## Calculs et modèle
Modèle source : BULLETIN CORE P1.xlsx, utilisé en lecture seule. CC moyen /5 multiplié par 4, puis pondération par coefficient. Moyenne des évaluations /20 pondérée séparément. Les notes ne sont arrondies que pour l’affichage et les résultats finaux. Aucune moyenne combinée n’est inventée. Une dispense est explicitement exclue du dénominateur ; un vrai zéro est conservé. Les coefficients vides bloquent la publication. Un coefficient 0 exclut la composante de la moyenne.

CORE : Juste Debout School CORE, 3 rue de l’Est, 75020 Paris.
INDUSTRY : Juste Debout School INDUSTRY, 27 boulevard de la Somme, 75017 Paris.
Les mentions SIRET/Qualiopi CORE ne sont pas recopiées vers INDUSTRY sans validation de l’entité.

## Vérification et limites
- Test SQL transactionnel `supabase/tests/school_bulletins.sql`, entièrement annulé : droits professeur/élève/direction, Jacky, moyennes, dispenses, coefficients manquants, versions immuables, conflits de modification et RLS sous le rôle authenticated. Aucune donnée de test conservée.
- Test DOM `web-access/test-bulletins.cjs` : accès hors connexion, professeur, administration, direction, élève, virgules décimales et coefficients initialement vides.
- PDF synthétique de 25 matières contrôlé sur deux pages : tableau paginé, synthèse et pied de page.
- Les avertissements Supabase SECURITY DEFINER des RPC sont attendus : les fonctions contrôlent l’identité et le périmètre côté serveur, search_path vide, aucun accès anonyme. L’audit est volontairement sans policy client ni grant. Le contrôle des mots de passe compromis reste un avertissement Auth préexistant, hors de ce module.
- Première recette avec un vrai professeur et un élève après configuration des affectations reste à faire. Aucun bulletin réel n’a été publié pendant le développement.
- Les notifications sont internes à l’application ; aucun email de bulletin n’est envoyé.

## Sources / construction
Schema : `supabase/schema-bulletins.sql` (migration déjà appliquée au projet School seul).
Interface : `web-access/bulletins.js`, `bulletin-pdf.js`, `bulletins.html`, `bulletins.css`.
Construction : dépendances épinglées dans web-access/package.json, `npm run build` depuis web-access. Copier HTML/CSS dans public et dans l’export statique app-release avant publication Netlify. Le module utilise la session School dédiée, sans liaison Event/TOTF.

## Catalogue CORE — reprise du 22 octobre
Le fichier BULLETIN CORE P1.xlsx a été lu directement (XML du classeur). Ses trois bulletins ne contiennent ni matières remplies ni coefficients. L’onglet PROFS fournit un catalogue, sans affectation classe/trimestre.
La configuration CORE propose désormais ce catalogue pour préremplir intitulé et nom affiché. Les coefficients et le compte professeur restent à valider explicitement. Les entrées d’entraînement libre sont exclues. Une sélection ne sauvegarde rien avant Enregistrer la matière. L’ajout libre et les matières existantes sont conservés.
Test DOM ajouté : sélection CORE, intitulé/nom repris, aucun compte ni coefficient attribué, puis sauvegarde avec valeurs nulles. Suite UI et construction web réussies. Publication Netlify à vérifier séparément.

## Tous les professeurs et retrait réversible
Les trois trimestres restent la périodicité des bulletins. Tous les couples matière/professeur connus du campus sont préremplis pour P1/P2/P3 de la saison 2026-2027 : catalogue CORE (49 lignes nommées) et union des plannings INDUSTRY (34 lignes nommées). Les lignes préexistantes sont conservées. Il s’agit d’une base de configuration à adapter par les admins, pas d’une affirmation que chaque intervenant enseigne toutes les classes chaque trimestre. Aucun compte, coefficient ou note n’est attribué automatiquement.
Plusieurs professeurs peuvent désormais avoir la même discipline avec des évaluations indépendantes. Les menus affichent la discipline et le nom.
Retirer de ce trimestre désactive la ligne : exclusion des prochains calculs, contrôles de publication et accès de saisie. Les notes sont conservées, les versions déjà publiées ne changent pas. Réintégrer restaure les évaluations. Les deux opérations sont contrôlées côté serveur par école et journalisées. L’ajout libre reste disponible.
Tests : suite SQL transactionnelle sous identités et rôles authentifiés (retrait, restauration, notes conservées, anciens PDF immuables, permissions, calculs), répétition du préremplissage sans doublons, tests DOM ajout/retrait/restauration, construction web.
Appliquer schema-bulletin-management.sql après schema-bulletins.sql, puis seed-all-bulletin-teachers.sql. Le schéma et le préremplissage ont été appliqués au seul projet School.


## Barème confirmé — 23 octobre 2026

Appliquer `supabase/schema-bulletin-coefficient-policy.sql` après le module de gestion. Migration appliquée au projet School dédié uniquement.

- Street dance (Hip-hop et variantes, Popping, Locking, House, Break/B.boying) : coefficient 4.
- Autres styles de danse : coefficient 2.
- Théorie (Anatomie, Histoire de la musique, etc.) : coefficient 1.
- 0, 1 ou 2 cours effectivement dispensés par matière/intervenant à la classe dans le trimestre : coefficient 0, exclusion des moyennes et du classement des notes. Le nombre concerne les cours dispensés à la classe, jamais les présences d’un élève ou le nombre de notes.
- CC et évaluation utilisent le même barème ; les notes CC restent converties de /5 en /20.

L’administration confirme la catégorie et le nombre de cours pour chaque ligne/trimestre dans Configurer les matières. Le poids est calculé côté serveur, y compris pour les anciens clients : aucune saisie libre de coefficient ne contourne la règle. Les professeurs ne peuvent modifier ni catégorie ni nombre de cours.

Les nombres de cours sont initialement inconnus : aucun total n’est déduit d’un planning incomplet. Une valeur inconnue ne devient jamais 0 ; elle bloque la publication et exclut provisoirement la ligne du classement. Les modules non identifiables sans décision pédagogique (chant, beatmaking, coaching, projets, etc.) gardent la catégorie « À classer ».

Une ligne avec moins de 3 cours apparaît sur le bulletin avec coefficient 0 et la mention du nombre de cours ; elle ne bloque pas la publication faute d’évaluation ou de compte professeur. À partir du troisième cours, la pondération et les contrôles d’évaluation reprennent. Les bulletins déjà publiés ne sont pas réécrits.

Les tests SQL `supabase/tests/bulletin_coefficient_policy.sql` doivent être exécutés dans BEGIN/ROLLBACK. Ils vérifient 4/2/1/0, les vrais zéros, le seuil 2→3, le classement pondéré, le refus de modification par un professeur, l’impossibilité de contourner la règle depuis l’ancien endpoint et les snapshots immuables. Tests réussis avant et après migration. Tests DOM des catégories et totaux, nombres entiers et droits d’affichage réussis.

Interface construite dans `public/assets/bulletins.js` et `app-release/assets/bulletins.js`. Publication Netlify distincte : le push GitHub ne déploie pas l’application. Le 23 octobre, la session Netlify de ce navigateur nécessite une connexion avant de récupérer le dernier export complet et de publier ce bundle. Ne pas uploader app-release seul.
