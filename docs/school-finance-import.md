# Reprise autonome des informations financières School

Ajout du parcours `/app/finance-import.html`, accessible depuis Finances des formations et Formations et inscriptions. Scope : reprise initiale des dossiers financiers des élèves déjà admis/rattachés à une promotion CORE ou INDUSTRY. Les modalités et les pièces demandées restent modifiables dans le module existant des inscriptions.

## Utilisation

1. Choisir la promotion. Saisir un dossier manuellement ou choisir XLSX, CSV/TSV, PDF texte ou TXT.
2. Pour un tableau, choisir la feuille et la ligne des en-têtes, vérifier les associations de colonnes puis préparer les propositions. Le rapprochement utilise l’email (ou le nom exact si aucun email n’est fourni), exclusivement dans la promotion sélectionnée ; les cas ambigus nécessitent une sélection manuelle.
3. Corriger chaque proposition et confirmer séparément les conditions financières, l’éventuel financement externe et la réception effective d’un règlement. La validation de la proposition identifie explicitement l’élève destinataire. Une modification de valeur réinitialise ces confirmations.
4. Enregistrer uniquement les propositions validées. Une ligne non confirmée financièrement reste un brouillon exclu des totaux confirmés. Un financement externe reste en attente par défaut. Un montant reçu extrait reste exclu des encaissements tant que sa réception n’est pas cochée.

Les dossiers existants ne sont jamais écrasés par l’import : un lien ouvre leur éditeur. Les doublons d’un même élève dans le lot sont bloqués et nécessitent de conserver une seule proposition. Cette première version importe une seule échéance et un seul règlement par dossier ; les dates et règlements complémentaires se saisissent dans le suivi existant. Le bouton d’enregistrement procède dossier par dossier et annonce le nombre effectivement enregistré ; il s’arrête à la première erreur. Une reprise recharge les dossiers existants et la contrainte unique sur le membre protège contre les doublons après une réponse réseau incertaine.

## Lecture des fichiers

Lecture locale dans un Worker limité à 45 secondes. Aucun fichier n’est envoyé à un service d’analyse ni conservé dans le stockage School. Seuls les champs explicitement validés sont enregistrés via les RPC financières existantes, avec une note de provenance (nom du fichier et SHA-256). Pas de stockage local persistant de la préparation ; déconnexion ou fermeture de page efface les données préparées.

Limites : 5 Mo, 300 lignes de données, 80 colonnes, 20 feuilles Excel, 30 pages de PDF, 200 000 caractères extraits. Les scans, photos, documents Word et anciens XLS ne sont pas pris en charge. PDF/TXT : extraction des libellés explicites et uniques tels que `Tarif :` ; aucun résumé IA, aucune déduction de montant ambigu. Le texte source est consultable. Les instructions éventuelles dans un document sont traitées comme du texte ; aucun script, lien, macro ou formule n’est exécuté. Les cellules contenant une formule doivent être contrôlées et saisies en valeur.

## Accès et validation

Accès et écriture limités par les contrôles existants aux directeurs School activés. Aucun schéma, rôle ou privilège n’est ajouté. Les emails de rapprochement proviennent de l’espace d’inscription privé, joint à la liste financière sur `member_id` ; aucun contenu de pièce n’est lu. La sauvegarde utilise `jds_save_tuition_account`, son historique et ses validations serveur existantes. Aucun email, invitation, paiement ou décision d’admission n’est déclenché.

## Vérifications

- `node web-access/test-import.cjs` : CSV cité, montants en centimes, dates invalides/futures, rapprochement ambigu, absence de sauvegarde avant validation, réinitialisation après modification, financement en attente, réception distincte, refus de remplacement d’un dossier existant, effacement à la déconnexion et refus d’accès.
- Régression : `test-tuition.cjs` et `test-enrollment.cjs` réussis.
- Navigateur : lecture d’un vrai XLSX et d’un PDF texte fictifs, email/tarif/remise proposés correctement. Prévisualisation avec API simulée et données fictives, sans connexion réelle de Nicolas ni mutation de dossier réel.
- Build : `npm run build:import --prefix web-access`. Dépendances épinglées et lockfile conservé. Les Worker PDF et licences sont servis depuis le même site.
- `scripts/package-school-import.py` : archive complète requise ; toutes les ressources précédentes sont préservées octet pour octet, sauf les deux pages privées qui reçoivent le raccourci. Les neuf redirections et la règle d’en-têtes restent identiques. Les fichiers `__qa-import.*` sont exclus de l’archive de production.

Publication vérifiée : déploiement `6adba9e8ff653a9d62b85146`, 514 fichiers côté Netlify, neuf redirections et une règle d’en-têtes sans erreur. Page officielle `https://www.juste-debout-school.com/app/finance-import.html` ouverte dans le navigateur : connexion School requise et aucun dossier exposé. Les trois scripts servis correspondent octet pour octet aux builds testés. Capture : `docs/assets/school-finance-import-live.jpg`.

La publication automatique reste verrouillée sur cette version. La tentative de rétablissement du réglage initial a été rejetée par la validation automatique de sécurité, qui exige un accord explicite de Vanessa pour ce réglage persistant de production. Aucune tentative de contournement. Le site reste publié. La connexion Qonto et les paiements automatiques restent hors de cet import.
