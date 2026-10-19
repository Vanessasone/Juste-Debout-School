# Contrôle des présences — 19 octobre 2026

## Correction
- Réussite affichée après retour d’un identifiant d’enregistrement, jamais avant la réponse serveur.
- Échecs API, réseau, session absente et cours d’une autre école ne sont pas présentés comme réussites.
- Attribution de school_id et by_staff ; RLS existantes maintenues.
- Double clic bloqué pendant l’enregistrement ; boutons de simulation retirés de l’application configurée.
- Liste des cours de la journée et actualisation du campus corrigées ; attente du chargement avant présence libre.
- Mention fictive +5 JD Coins supprimée en FR/EN. Aucune attribution automatique ajoutée.

## Vérification
- TypeScript sans erreur et export web réussis.
- node tests/checkin.cjs : neuf scénarios réussis (refus API, hors ligne, absence de session, école inconnue, cours autre école, réponse sans reçu, présence libre, présence liée au cours, isolation de la démo).
- Test SQL transactionnel School : insert refusé à anon et à un membre sans rôle ; insertion/relecture administrateur autorisées. ROLLBACK final : aucune présence de test conservée.
- Aucun rôle activé, aucune invitation envoyée, aucun paramètre SMTP changé.

## Limites
Le parcours authentifié complet avec caméra et une présence réelle reste à valider avec l’accueil. La caméra native n’a pas été testée ; sur navigateur la borne propose la recherche manuelle. Le verrou de double clic ne constitue pas une contrainte d’unicité en base entre plusieurs appareils. Les habilitations existantes restent appliquées ; cet ajustement ne crée pas de politique de présence automatique ou de décompte de cartes.
