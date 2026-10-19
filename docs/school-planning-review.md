# Planning et réservations — 19 octobre 2026

- La liste des écoles ne bascule plus vers les écoles de démonstration sur erreur lorsque le service réel est configuré.
- Les erreurs du planning ne sont plus assimilées à une liste vide. Affichage FR/EN et nouvelle tentative dans le planning.
- Accueil et recherche gèrent les erreurs et ignorent les réponses après changement de filtre ou fermeture. Transition du carrousel accueil nettoyée au changement de campus.
- Les réservations sont rechargées à chaque retour sur l’écran ; erreur distincte et bouton Réessayer.
- Cours open/enfants : informations d’accueil, sans simulation de réservation réelle. Les simulations restent réservées au mode démonstration.
- Les fonctions de réservation exigent une confirmation serveur reconnue ; aucun paiement ou débit de carte ajouté.
- La borne ne propose plus de présence libre après un échec de chargement des cours.

Vérifications : TypeScript ; tests/checkin.cjs ; tests/planning.cjs ; export web. Aucun cours scolaire créé, aucune inscription de test, aucun rôle activé ni email envoyé. Les essais complets en compte élève/parent/accueil restent à faire avec les utilisateurs autorisés.
