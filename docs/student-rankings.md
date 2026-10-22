# Classements élèves

L’administration consulte `/student-rankings` : cartes Notes, Assiduité et Global, scores exacts et rangs par promotion/saison, bonus et pénalités. L’élève utilise `/my-rankings`, accessible depuis son profil et Ma formation. Il reçoit exclusivement ses propres lignes, jamais le classement nominatif de sa promotion.

Le calcul commun `school_private.student_rankings_engine()` reste privé (aucun EXECUTE pour anon/authenticated). Il classe les cohortes autorisées avant le filtrage. `jds_student_three_rankings()` retourne les dossiers du périmètre administratif ; `jds_my_student_rankings()` ne retourne que les membres dont profile_id = auth.uid(). Le RPC personnel ne prend aucun identifiant d’élève ou de promotion en paramètre. Aucun détail de note d’un autre élève n’est exposé. Le registre des bonnes actions reste réservé à l’équipe habilitée. Les restrictions confidentielles du ranking professeurs sont inchangées.

Notes : moyenne des notes individuelles soumises, CC /5 converti sur /20 puis moyenne sur 100 ; coefficients explicites respectés, sinon poids 1. Global = notes sur 100 + bonnes actions validées − pénalités. Assiduité = 100 − pénalités. Les bonus n’effacent pas le seuil d’avertissement. Sans note, notes/global non classés ; sans appel, assiduité non classée. Ex æquo conservés. Les données incomplètes sont signalées.

Les barres utilisent une échelle visuelle 0–100, sans modifier le score réel (qui peut dépasser ces bornes). Aucun historique d’évolution n’est inventé.

Validation : TypeScript, tests SQL transactionnels `student_personal_rankings.sql`, `student_three_rankings.sql` et `student_attendance_ranking.sql`. Le test personnel utilise le rôle authenticated et deux comptes élèves distincts : rang calculé sur la promotion complète, retour limité à soi, refus du moteur privé et du RPC administratif, absence de résultats pour un compte non rattaché et une identité absente. Les fixtures sont annulées par ROLLBACK. Une recette visuelle avec un compte réel rattaché reste nécessaire ; aucun compte élève réel n’était rattaché lors de l’implémentation.
