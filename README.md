# On Stride

L’espace de travail simple pour organiser tes projets, tes clients et ton travail.

Site statique (aucune compilation) + Supabase pour la connexion et les données.
Le guide de mise en ligne est dans [LISEZ-MOI.md](LISEZ-MOI.md).

## Les plus

- **Tableau blanc** : dans chaque projet, un espace libre où poser des blocs, les déplacer et les relier entre eux. Les cartes du Kanban peuvent y être posées : un lien entre deux cartes indique laquelle doit être finie d’abord, et la suivante affiche « En attente de… ».
- **Chrono et rentabilité** : un chrono sur chaque carte de tes projets. Le temps reste privé ; avec le montant du projet, il donne ton taux horaire réel.
- **Point client** : un message d’avancement écrit à partir de tes cartes (terminé, en cours, prochaines étapes), à copier ou à ouvrir dans ta messagerie.
- **Mode Focus** : depuis l’accueil, une seule tâche à l’écran, la plus utile à faire maintenant (en retard, du jour, prioritaire, pas bloquée par une autre).
- **À encaisser** : un bloc d’accueil qui liste ce qu’on te doit, avec un message de relance prêt à envoyer pour les projets livrés.
- **Cartes récurrentes** : une carte peut se répéter chaque jour, semaine ou mois ; terminée, elle revient à la prochaine date.
- **Inbox** : une messagerie entre personnes du site, présentée comme une boîte mail (reçus, envoyés, objet, réponses, non lus). Alerte par vrai e-mail en option.
- **Bazar** : les tâches notées en vrac, à ranger plus tard (l’ancien Inbox).

Les six premières n’ajoutent rien à la base de données (`js/extras.js`, `js/more.js`). L’Inbox (`js/mail.js`) utilise la table `messages` : il faut relancer `supabase/schema.sql` une fois, voir [LISEZ-MOI.md](LISEZ-MOI.md).
