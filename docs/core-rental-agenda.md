# CORE · Locations et agenda

Périmètre validé le 22 octobre 2026 : trois salles CORE, louables hors cours et occupations ; week-ends et vacances ouverts sous réserve des horaires d’accès et des occupations datées. INDUSTRY n’est pas modifié.

Grille historique confirmée par Vanessa et réintégrée dans la base : salle1 132m² 40€/h journée semaine /70€ soir /40€ week-end avant19h ; salle2 75m² 35/50/35€ ; salle3 50m² 30/45/30€. Aucun tarif inventé pour week-end après19h, avant10h, après22h ou pour une heure chevauchant deux tranches : devis. L’affichage journalier propose des fenêtres d’une heure toutes les30minutes ; ce n’est pas encore une prise de réservation.

Administration : `/admin-rentals`, dans le hub si accès CORE. Saisie de cours récurrents, réservations annuelles, événements et fermetures par salle ou toutes salles ; période, jour ISO, horaires, suspension éventuelle pendant les vacances confirmées. Retrait par désactivation avec confirmation. Le libellé du réservataire est privé.

Client connecté : `/rental-calendar`, depuis Locations CORE. Le RPC retourne uniquement salle, horaires, état et prix ; aucune identité de locataire ou motif privé. Les cours datés de `jds_sessions` et `jds_training_lessons` bloquent automatiquement les créneaux. Un cours sans salle rattachée bloque toutes les salles par prudence. Le champ optionnel `jds_training_lessons.rental_studio_id` permet un rattachement précis ; à défaut la décision reste conservatrice. Les libellés de lieu libres ne sont pas assimilés à un numéro de salle.

Les occupations privées et paramètres sont sous RLS CORE, écritures uniquement via RPC protégés. Les vacances prévisionnelles retrouvées sont des brouillons, jamais appliquées automatiquement à INDUSTRY. Une vacance confirmée suspend uniquement les récurrences portant cette option ; un cours daté ou une réservation maintenue reste bloquant.

Activation : la plage10h–22h est un brouillon de préparation, pas une confirmation des horaires d’accès. Tant que `verified_until` est vide, aucun créneau n’est déclaré disponible, y compris week-end. Il faut intégrer/contrôler les cours open, formations et réservations annuelles, puis renseigner horaires exacts, horizon vérifié et référence du planning. Attention : le programme CORE historique comprend des cours enfants le samedi ; ne pas en déduire une occupation actuelle sans validation face à la nouvelle consigne week-end libre. Aucun planning récurrent n’a été inventé ou attribué arbitrairement à une salle.

Paiement : nouveau compte Stripe School à créer/connecter. Aucun Checkout, encaissement ou réservation confirmée n’est simulé. La disponibilité est indicative ; elle ne réserve pas le créneau. Il reste à implémenter le verrou transactionnel de réservation, le paiement et sa confirmation serveur après la connexion du compte et la validation du calendrier. Ne jamais réutiliser un compte d’une autre activité.

Tests : SQL transactionnel `supabase/tests/core_rental_agenda.sql` : vérification de calendrier, chevauchement, créneau adjacent, isolation des salles, réservations annuelles pendant vacances, suspension explicite, vacances provisoires, tarifs non définis, confidentialité des réservataires, refus d’écriture et configuration élève. TypeScript et compilation web. Aucun faux locataire, cours ou réservation maintenu après tests.
