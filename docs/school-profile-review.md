# Enregistrement du profil — 19 octobre 2026

- Droit UPDATE ajouté uniquement à available_for_school, sous la politique existante réservant les modifications à son propre profil.
- Nom, alias, ville, pays, styles, niveau, biographie, Instagram et disponibilité sauvegardés dans une même requête ; plus de seconde requête ignorée en cas d’erreur.
- Confirmation après retour d’un identifiant de profil. Les erreurs d’authentification, de droits et les réponses sans ligne ne deviennent plus une réussite.
- En cas d’échec du chargement, formulaire indisponible et bouton Réessayer ; aucune saisie vide proposée à la place des données non chargées.
- Message de réussite retiré lors d’une nouvelle modification. Saisie bloquée pendant enregistrement ou téléversement afin de ne pas confirmer des valeurs différentes de celles envoyées.

Vérification : TypeScript ; tests/profile.cjs ; tests/checkin.cjs ; tests/planning.cjs ; export web. En base, test transactionnel de sa propre disponibilité, refus des rôles/notes internes et d’une écriture sur un autre profil ; ROLLBACK final. Les disponibilités réelles ne sont pas changées par les tests. Pas d’activation de responsable ni d’invitation.
Le parcours complet depuis un compte connecté reste à essayer avec Vanessa ; les champs de disponibilité ne sont pas publiés sur le site vitrine par cette correction.
