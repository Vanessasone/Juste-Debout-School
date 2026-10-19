# Vérification des prestataires School — 19 octobre 2026

Périmètre : School uniquement. Audit en lecture seule ; aucun achat, abonnement, transfert, changement de région, export d’élèves, purge ni signature de contrat.

## Constats propres au compte
- Projet Supabase School zmzunjphubbdumowcurk : état ACTIVE_HEALTHY ; région eu-west-3 (Paris), obtenue via get_project.
- Organisation gdtpqtakjfsbvbtzsbhg : plan pro, confirmé via get_organization.
- La région désigne les données principales du projet ; elle ne prouve pas une localisation exclusivement française de tout traitement.
- Les pages publiques déjà publiées conservent une formulation prudente : six mois est une cible School, pas une affirmation des réglages prestataires.
- Site et application sont des publications statiques Netlify. Les durées de Function Logs ne décrivent pas à elles seules les journaux de trafic ou de sécurité de l’hébergeur.

## Prestations documentées et limites de vérification
| Sujet | Documentation actuelle | Conclusion |
|---|---|---|
| Supabase journaux API/base et Auth | Offre Pro : historique annoncé de 7 jours | Durée standard du plan, pas preuve de tous les réglages, drains, tables d’audit ou copies. Ne pas annoncer six mois effectifs. |
| Supabase sauvegardes quotidiennes | Pro : accès aux 7 derniers jours | Offre confirmée, existence des points de sauvegarde et éventuel PITR pas inspectés. Pas de garantie de restauration testée. |
| Fichiers Storage | Les sauvegardes de la base ne contiennent pas les objets Storage | Prévoir séparément la restauration des documents ; ne pas exporter vers une destination non autorisée. |
| Localisation et transferts Supabase | FAQ : assistance mondiale, télémétrie et CDN peuvent impliquer d’autres régions ; clauses contractuelles types prévues par le DPA | Paris n’équivaut pas à « tout reste en France ». Examiner contrat réellement applicable et analyse des transferts. |
| Netlify | DPA public révisé juin 2026 ; cadre DPF et clauses types selon le transfert | Texte public disponible ; preuve du rattachement contractuel à GB SCHOOL non obtenue. |
| Journaux Netlify | Fonction/Edge : au moins 24 heures, jusqu’à 7 jours selon plan ; observabilité/flux distincts | Ne pas déduire une durée globale pour les IP visiteurs ; vérifier plan, journaux de trafic et éventuels drains séparément. |

## Pièces et confirmations encore nécessaires
1. Preuve du client contractuel des services (GB SCHOOL ou prestataire agissant pour GB SCHOOL) et instructions de sous-traitance adaptées. Le nom du compte technique ne démontre pas le titulaire juridique du contrat.
2. Version applicable des DPA Netlify/Supabase ; sous-traitants, garanties de transfert et analyse appropriée au contexte de l’école. Aucune acceptation ni signature réalisée par cet audit.
3. Journaux et sauvegardes : durées réellement disponibles, drains éventuels, traitement des tables d’audit en base, points de restauration existants et procédure de restauration des fichiers Storage.
4. Dossiers de formation : exemplaire de contrat/convention et conditions du financeur pour chaque type effectivement utilisé. La page Formation Pro et le programme publics n’établissent pas les financements réels par élève.
5. Responsable opérationnel des demandes de droits et des revues de conservation ; calendrier de revue à organiser. Les responsables préparés dans l’application ne sont ni activés ni invités ici.

## Décisions
- Ne pas créer de drain payant ni copier automatiquement des journaux pour atteindre six mois : besoin, minimisation, coût et destination doivent d’abord être déterminés.
- Ne pas présenter l’existence d’un DPA public comme la preuve d’une acceptation au nom de l’école ou d’une conformité complète.
- Maintenir les réserves de la notice publique tant que les confirmations précédentes manquent.

## Sources
- https://supabase.com/docs/guides/platform/regions
- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/legal/privacy-resources/data-residency-and-transfers-faq
- https://supabase.com/legal/customer-resources/data-processing-addendum
- https://www.netlify.com/pdf/netlify-dpa.pdf
- https://www.netlify.com/trust-center/
- https://docs.netlify.com/build/functions/logs/
- https://docs.netlify.com/manage/monitoring/observability/overview/
- https://www.juste-debout-school.com/formation-pro/
