# Conservation des données School — 19 octobre 2026

Politique de traitement manuel : aucune tâche de suppression ou d’archivage automatique n’est activée. Périmètre exclusivement School, hors TOTF et application événementielle.

| Catégorie | Échéance / déclencheur | Action et nature |
|---|---|---|
| Demande sans inscription ni contrat | 12 mois après clôture | Effacer l’échange sauf pièce nécessaire à un litige. Choix interne autorisé par Vanessa. |
| Compte sans action | 24 mois après dernière action de la personne | Réexaminer, vérifier prestations/formation/droits en cours et avertir avant fermeture. Aucun effacement automatique. Choix interne, pas délai légal universel. |
| Profil facultatif | Fermeture effective du compte | Effacer photo/bio/préférences sauf justification spécifique. Conserver séparément les preuves nécessaires. |
| Factures et justificatifs comptables | 10 ans depuis clôture de l’exercice | Archive comptable à accès limité. Obligation légale. |
| Contrats / correspondances commerciales | 5 ans | Qualifier le document et le point de départ avant de dater l’échéance ; ne pas prendre la création du compte comme départ. |
| Contrat électronique consommateur >=120 € | Jusqu’à exécution puis 10 ans depuis livraison/prestation | Archive de la preuve contractuelle ; pas du profil entier. |
| Dossier pédagogique / présence / attestation | Fin formation puis durée attachée au financement et contrat | Classification indispensable avant suppression. Pas de durée unique pour CORE/INDUSTRY. |
| Journal sécurité School | Cible 6 mois glissants | Recommandation adaptée, réglages prestataires à vérifier avant de prétendre une purge effective. Isoler les preuves d’incident si nécessaire. |

## Revue manuelle périodique à organiser
1. Désigner un responsable de conservation et un suppléant ; droits par campus maintenus. Les responsables préparés restent inactifs jusqu’à activation autorisée.
2. Pour chaque catégorie, relever finalité, base légale, responsable, système, date de clôture/fin de formation/dernière action, financement, échéance, statut contentieux et éventuelles copies/sauvegardes. Une importation ne remet pas le délai à zéro.
3. Produire une liste privée des seules échéances à examiner. Ne pas publier les élèves ni exporter l’annuaire dans un outil public.
4. Avant fermeture d’un compte : vérifier le service et les droits en cours, avertir la personne, traiter sa réponse, puis décision humaine. Définir le délai d’avertissement avant mise en service ; aucun message envoyé à ce stade.
5. Vérifier les exceptions documentées (litige, contrôle, obligations financeur). Une exception vise les seules preuves nécessaires, pas une conservation intégrale illimitée.
6. Préparer un lot réversible / simulation et faire contrôler son périmètre avant toute action destructive. Aucun SQL DELETE, cascade Auth ni purge de stockage n’est livré ou exécuté ici.
7. Archiver uniquement les pièces nécessaires dans un espace réellement restreint ; un indicateur dans une table lisible par les mêmes personnes ne suffit pas.
8. Après opération autorisée, conserver une trace minimale (catégorie, règle, date, auteur, nombre), sans dupliquer les données supprimées ; tenir compte des sauvegardes et empêcher la réintroduction après restauration.

## Points ouverts sur les formations
Identifier les contrats et financements réellement utilisés : financement personnel, CPF, OPCO, subventions. Obtenir les conditions attachées à la session. Les anciennes FAQ CPF mentionnant quatre ans ne suffisent pas : une version plus récente existe et doit être vérifiée pour le contrat concerné. Ne pas appliquer ce délai par défaut.
Les durées pour archives de certification, dossiers de mineurs, justificatifs médicaux éventuels et droits à l’image doivent être qualifiées séparément si ces traitements sont activés.

## Sources vérifiées
- https://entreprendre.service-public.gouv.fr/vosdroits/F10029
- https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees
- https://www.cnil.fr/fr/securite-tracer-les-operations
- https://www.cnil.fr/fr/questions-reponses-sur-les-referentiels-relatifs-la-gestion-des-activites-commerciales-et-des (exclut les établissements d’éducation ; ne constitue pas une règle générale des dossiers élèves)
- https://of.moncompteformation.gouv.fr/espace-public/version-14-des-conditions-dutilisation-ce-qui-change
- https://data.inpi.fr/export/companies?format=pdf&ids=%5B%22795298322%22%5D (identité GB SCHOOL)
