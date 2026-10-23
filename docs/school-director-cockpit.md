# Cockpit autonome — formations, inscriptions et finances

Livraison du 23 octobre 2026, projet School `zmzunjphubbdumowcurk` exclusivement. Aucun autre projet Juste Debout n’est utilisé. Le cockpit, le suivi des locations et le site existant restent conservés.

## Parcours de Nicolas

1. Ouvrir **Formations et inscriptions** depuis le cockpit. Créer une formation/promotion ou modifier son nom ; une formation ayant déjà des élèves conserve son école et sa saison pour éviter un déplacement silencieux des dossiers.
2. Configurer l’intitulé, les dates, le tarif de référence facultatif, les modalités de paiement, les informations d’inscription et la liste des pièces (obligatoires ou facultatives). Confirmer ces informations. Aucun texte contractuel, tarif ni document obligatoire n’est inventé par le système.
3. Retrouver un élève déjà rattaché, ou ajouter une nouvelle personne dont l’admission a été explicitement confirmée. Cette action ne crée pas de compte d’authentification et n’attribue aucun rôle de gestion.
4. Ouvrir **Tarif, aides et règlements** : confirmer le prix individuel, la remise, la bourse interne, les financements externes, les payeurs et l’échéancier. Le tarif de référence confirmé dans la configuration peut préremplir un nouveau dossier ; il reste à confirmer individuellement.
5. Préparer le dossier puis générer son lien personnel, après confirmation explicite de l’admission et de l’adresse. Copier le lien ou préparer un email dans la messagerie de Nicolas. Le bouton mailto prépare le message ; l’application ne prétend pas l’avoir envoyé.
6. L’élève utilise un compte School dont l’email confirmé correspond à l’invitation. Après connexion, il revient à son dossier, consulte uniquement ses modalités, transmet ses pièces privées, confirme leur lecture et soumet le dossier.
7. Nicolas examine chaque pièce, accepte ou demande une correction, puis valide le dossier. La validation n’active aucun compte automatiquement. Après vérification de l’identité dans l’annuaire, un bouton distinct rattache explicitement le compte confirmé à la promotion. Les contrôles existants de rattachement restent en place.

Les liens ont 256 bits aléatoires, sont conservés hachés côté serveur et expirent après 14 jours. Un renouvellement révoque le précédent. Le lien est placé dans le fragment de l’URL, pas dans une requête HTTP ; après réclamation réussie il est effacé de l’URL et du stockage temporaire. Il ne suffit jamais à ouvrir le dossier sans le bon compte confirmé. Un élève ayant déjà réclamé son dossier le retrouve aussi depuis **Mon dossier d’inscription** dans son profil.

## Finances

- Prix net de formation = tarif avant remise − remise − bourse interne accordée par l’école.
- Part élève/proches = prix net − financements externes **confirmés**. Une demande en attente n’est pas déduite ; une prise en charge confirmée n’est jamais assimilée à un encaissement.
- Les règlements identifient le payeur réel : élève, parent/proche, organisme ou autre. Leur date, montant, mode et référence de contrôle sont requis. Une date future ne peut pas être déclarée encaissée.
- Les règlements couvrent l’échéancier par ordre de date. Un solde n’est « dépassé » que pour une date strictement antérieure au jour local de Paris, avec conditions et échéancier confirmés. Les échéances du jour restent dans la fenêtre à 30 jours.
- Les brouillons sont exclus des montants confirmés. Les élèves sans dossier sont signalés à préparer, sans inventer de dette. Les annulations sont séparées des totaux actifs. Les trop-perçus sont affichés pour vérification.
- Les règlements enregistrés sont immuables : correction par annulation de saisie motivée, puis nouvelle ligne. Rien n’est supprimé de l’historique. Aucun remboursement bancaire n’est exécuté.
- Une modification des modalités financières après soumission ou validation rouvre le dossier pour nouvelle lecture. L’enregistrement d’un règlement ou d’une note interne ne le rouvre pas.

Vue globale et par école, promotion, saison ; recherche par élève, payeur et référence ; filtres de préparation, échéanciers, retards, trop-perçus et soldes. Les comptes sont rattachés aux membres de formation existants, un dossier par membre/promotion/saison.

## Locations CORE

Nicolas peut créer et modifier un blocage sur une salle ou toutes les salles : ponctuel, tous les jours d’une période, ou récurrent chaque semaine. Les dates de début/fin sont incluses. Il choisit horaires, motif, type et suspension éventuelle pendant les vacances confirmées. Les modifications conservent l’identifiant, vérifient la révision et gardent les instantanés avant/après. Retirer un blocage le désactive, sans suppression de l’historique.

Les règles du fichier de novembre restent prioritaires : les zones rouges ou renseignées restent indisponibles ; retirer un blocage manuel ne transforme pas une cellule source occupée en créneau louable. Les cours et réservations existants restent pris en compte. Les fonctions d’édition des cours de formation et des cours open restent accessibles depuis le même cockpit.

## Accès et pièces

Finances et dossiers d’inscription réservés aux quatre directeurs School autorisés et activés, avec compte confirmé et non banni. Aucun privilège administratif générique ne suffit à ouvrir ces données. L’élève passe par une projection de son dossier : aucun annuaire complet, note interne, donnée d’un autre élève, historique financier de direction ou hachage de lien ne lui est transmis.

Pièces privées dans `school-enrollment`, PDF/JPEG/PNG, 10 Mo maximum. Chemins aléatoires sans nom de fichier d’origine. L’accès de stockage vérifie le dossier et la pièce demandée ; les liens de consultation durent 60 secondes. Aucune pièce n’a été ouverte ou transmise pour cette livraison. Les données privées sont effacées de l’interface à la déconnexion, y compris en cas de réponse réseau tardive.

Les tables nouvelles ont RLS et aucun droit d’écriture directe pour les utilisateurs. Les points d’entrée publics sont invoker ; les implémentations privées contrôlent l’identité et le périmètre. L’écriture vérifie les révisions pour empêcher les écrasements concurrents et garde un historique. Le cockpit expose des nombres d’actions financières et d’inscription uniquement aux directeurs habilités.

## Rapport de 9 h

Le rapport quotidien existant conserve son horaire Europe/Paris et ses protections contre les doublons. Ajout des nombres par école/promotion/saison : conditions financières en préparation, échéanciers à confirmer, échéances dépassées, financements externes en attente, inscriptions soumises et modalités non configurées. Les corrections en attente de l’élève sont distinguées. Ni pièce, chemin de fichier, URL signée, lien individuel, jeton, note financière ni détail de payeur ne sont transmis dans le rapport.

## Vérifications

- TypeScript et export Expo web réussis.
- Suite DOM complète : accès School, bulletins, cockpit, calendrier public, galeries, suivi des locations, finances, inscriptions et édition des blocages.
- Tests de calcul : centimes exacts, bourses internes, financement confirmé/en attente, soldes, paiements partiels, trop-perçus, annulations de saisie, échéances du jour et heure de Paris.
- Tests PostgreSQL avant puis après application : contexte authentifié de Nicolas, refus pour un autre compte et anon, refus d’écriture directe, révisions périmées, historique, lien trompeur, pièces requises, bon email confirmé, rotation des invitations, absence de fuite de note interne, stockage isolé et nouvelle lecture après modification financière.
- Identités et dossiers synthétiques entièrement en transaction annulée. Vérification finale : zéro dossier financier, zéro inscription, zéro configuration métier, zéro compte synthétique et zéro blocage synthétique persistants. Aucun email d’inscription, règlement réel, aide, validation réelle ou changement de droit n’a été exécuté.
- Conseillers de sécurité : aucun nouvel avertissement concernant les nouveaux objets. Les avertissements historiques du projet restent hors périmètre.

Préparation de publication : `python scripts/package-school-admin.py ARCHIVE_COMPLETE_QONTO.zip EXPORT_EXPO SORTIE.zip`. Les pages et ressources publiques sont conservées octet pour octet, ainsi que les neuf redirections. Ajout des pages privées et mise à jour de l’export Expo sous `/app`.

## À renseigner réellement

Nicolas doit confirmer les modalités de chaque formation et les pièces qu’il souhaite demander, puis reprendre les tarifs, bourses/subventions, échéanciers et encaissements de son suivi actuel. La structure est disponible sans créer de faux montants. Le raccordement bancaire Qonto et les paiements automatiques restent à autoriser/configurer. La prise de connaissance du dossier ne remplace pas une signature contractuelle ; aucun modèle de contrat juridiquement finalisé n’est revendiqué.

## Publication vérifiée

Déploiement `6adb7124a4b96f6a0fe38a3e`, 508 fichiers, neuf redirections et une règle d’en-têtes acceptées sans erreur. Prévisualisation : trois pages autonomes chargées avec leur protection de connexion, navigation entre inscriptions et finances, et accueil Expo chargé. Publication confirmée sur le domaine officiel ; publication automatique rétablie.

Page officielle contrôlée : `https://www.juste-debout-school.com/app/enrollments.html`. Sans session, aucun élève ni dossier n’est affiché. Capture : `docs/assets/school-director-enrollment-live.jpg`. Les interactions authentifiées sont vérifiées par les tests DOM et les transactions SQL de rôles, sans simulation de la session de Nicolas dans le navigateur.

Export actif : `/app/_expo/static/js/web/entry-887aaad3593923833ede52c995a8843a.js`. SHA-256 de l’archive complète : `00bf3322cb1c282dd8deabb9b077423630c96d04c935a5c8532f003e13c65f87`.

Lecture finale avec les droits de Nicolas : accès financier autorisé, 75 rattachements élèves et six promotions disponibles ; zéro dossier financier ou d’inscription initialisé. Il s’agit d’un suivi à reprendre, pas d’un état d’impayés. Le rapport de Nicolas reste actif à 9 h et inclut les nouveaux comptages.
