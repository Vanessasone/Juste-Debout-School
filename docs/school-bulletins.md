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
