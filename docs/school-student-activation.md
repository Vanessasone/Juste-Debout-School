# Suivi des élèves actuels

Page privée : /app/student-activation.html, accessible depuis À traiter et Formations et inscriptions.

La fonction jds_student_activation_workspace est en lecture seule. Son implémentation privée vérifie la connexion confirmée, l’absence de suspension et les droits existants de gestion School pour chaque campus. Aucun nouveau rôle ni rattachement automatique n’est accordé. Les noms et emails sont chargés après authentification, jamais intégrés au site public.

Vérification du 23 octobre 2026 : 75 élèves répertoriés, aucun compte rattaché, 73 comptes à créer, 2 emails à compléter. Aucune demande élève en attente au moment du contrôle. Le rattachement se fait par le parcours Élève en formation puis validation humaine de la fiche existante. Le dossier financier n’est pas un prérequis.

Tests transactionnels réussis : rattachement des élèves actuels, suivi d’activation (administrateur autorisé, élève et anonyme refusés), absences, classements personnels et bulletins (publication, accès élève, refus des données d’autrui). Tous les exemples sont annulés en fin de test ; aucun dossier réel n’a été validé ou modifié. Les fixtures de bulletin ont été adaptées aux règles actuelles catégorie/nombre de cours.

Test interface : filtrage, liens vers les demandes, accès refusé, effacement des données à la déconnexion, appels limités à la fonction de lecture.

Restent soumis à validation : les deux coordonnées manquantes et l’identité des futures demandes. L’envoi collectif et la configuration school@juste-debout.com restent en attente de Nicolas et de son accès OVH. Aucun email envoyé.
