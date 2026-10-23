# Nicolas — locations, règlements et Qonto

Décision de Vanessa du 23 octobre 2026 : Qonto pour School, aucun compte Stripe School à créer. Vanessa confirme que Nicolas et elle disposent tous deux d’un accès titulaire/administrateur au compte Qonto de l’école. Aucun accès bancaire, IBAN, jeton ni secret n’a été récupéré pendant cette livraison.

## Livré

Le cockpit et l’agenda CORE ouvrent **Locations et règlements**, page privée `/app/rental-accounts.html`. Un dossier contient le client ou la structure, une description de la période, une occupation facultative, le montant convenu TTC, le total encaissé vérifié manuellement, une référence de facture, un lien Qonto facultatif et les références des règlements constatés. Les statuts distinguent montant à définir, à encaisser, partiellement encaissé, soldé et annulé. La recherche et les filtres permettent de retrouver les dossiers.

Les trois indicateurs portent sur les dossiers actifs ; les devis sans montant sont explicitement exclus du solde à encaisser. Un lien de paiement doit avoir l’origine exacte `https://pay.qonto.com/`. Le domaine ressemblant `pay.qonto.com@evil.example` est refusé par le client et par la base. La saisie des montants conserve les centimes, accepte la virgule et interdit valeurs négatives, notation exponentielle et excès de décimales.

L’accès est réservé à la gestion CORE selon les responsabilités existantes. Aucun nouveau droit n’est attribué. Les tables `jds_rental_accounts` et `jds_rental_account_events` ont RLS et seulement SELECT pour authenticated ; anon n’a aucun accès. L’écriture passe par un wrapper invoker et une fonction privée avec contrôle de l’identité et du périmètre. Chaque version garde un instantané horodaté et l’acteur. Une révision périmée est rejetée pour empêcher l’écrasement des modifications d’un autre gestionnaire. Les données affichées sont effacées lors de la déconnexion.

Une saisie comptable ne réserve, ne libère et ne confirme aucune salle. L’agenda validé continue de contrôler les cours, réservations annuelles et occupations. Annuler le dossier ne réalise aucun remboursement, ni annulation bancaire, ni libération de l’agenda. Le paiement automatique et la synchronisation bancaire ne sont pas activés.

## Vérification

- TypeScript, export Expo web et tests DOM du cockpit réussis.
- Tests de saisie : soldes, devis sans montant, refus d’un encaissement supérieur au convenu, domaine Qonto exact, boutons utilisables après enregistrement et effacement à la déconnexion.
- Tests PostgreSQL sous authenticated avec le contexte de Nicolas : création, versement partiel, solde, historique, rejet des révisions périmées, rejet des liens trompeurs et des écritures directes hors historique. Refus de lecture/écriture pour un compte sans responsabilité et pour anon.
- Tous les dossiers synthétiques ont été annulés par ROLLBACK. Contrôle final : zéro dossier et zéro dossier de test persistants. Aucun encaissement réel créé ni email envoyé par ces tests.
- Conseillers Supabase : aucun nouvel avertissement concernant ces tables ou fonctions ; les avertissements historiques du projet ne sont pas modifiés par cette livraison.

Le packager `scripts/package-school-qonto.py` conserve tous les fichiers publics, sauf le texte explicatif du calendrier de location. Il met à jour l’export `/app` et ajoute la page privée. Les photographies et les deux catalogues de 19 intervenants restent conservés, ainsi que les neuf redirections. Les ressources de la nouvelle page sont versionnées selon leur contenu.

## Raccordement Qonto restant

Le module ne revendique aucune connexion bancaire. Pour l’encaissement par carte, Qonto documente des liens de paiement utilisant Mollie : activation depuis Qonto, vérification de l’entreprise et acceptation des conditions par le titulaire ou l’administrateur. Ces démarches et acceptations n’ont pas été effectuées ici. Les liens déjà créés dans Qonto peuvent être renseignés manuellement dans les dossiers. Le virement direct est également possible, avec contrôle manuel de la réception avant mise à jour du total encaissé.

Une synchronisation ultérieure doit identifier le compte School exact, obtenir l’autorisation dédiée de Qonto, conserver les secrets uniquement côté serveur et tester le rapprochement en environnement de test. Un paiement autorisé ou en cours n’équivaut pas à un paiement encaissé. Ne pas utiliser le seul retour du navigateur pour marquer un dossier payé. Ne pas rattacher un autre compte Juste Debout à cette intégration.

Sources officielles consultées le 23 octobre 2026 :

- https://docs.qonto.com/api-reference/business-api/payments-transfers/payment-links/introduction
- https://docs.qonto.com/api-reference/business-api/payments-transfers/payment-links/create
- https://support-fr.qonto.com/hc/fr/articles/32614584737425-Comment-fonctionnent-les-liens-de-paiement-pour-les-factures-avec-Qonto
- https://supabase.com/docs/guides/database/postgres/row-level-security

## Rapport de Nicolas

Le récapitulatif existant de Nicolas conserve son horaire de 9 h Europe/Paris. Il inclut désormais les nombres de dossiers actifs à chiffrer, avec solde à encaisser et sans référence de facture, avec le lien vers le nouveau module. Les montants manuels ne sont jamais présentés comme une synchronisation bancaire. Aucun nom client ni lien de paiement n’est copié dans l’email. Aucun nouvel envoi ponctuel n’est déclenché par cette mise à jour.

Prévisualisation finale : 6adb5efc982ab89352ba84d8, archive complète de 500 fichiers. Page privée chargée dans le navigateur ; visite sans session : connexion School requise, aucun dossier affiché. L’interface authentifiée est vérifiée par les tests DOM et les autorisations de Nicolas par les tests PostgreSQL, sans simulation de sa session dans le navigateur.

Publication confirmée le 23 octobre 2026 : ce même déploiement est publié sur `https://www.juste-debout-school.com/app/rental-accounts.html`. La publication automatique habituelle est rétablie. Contrôle sur le domaine officiel : styles et liens chargés, connexion requise, aucun dossier divulgué. Capture : `docs/assets/school-qonto-rental-live.jpg`. Le retour vers `/app/admin` charge bien l’application et son accueil initial pour une visite sans session.
