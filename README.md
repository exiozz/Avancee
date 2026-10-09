# On Stride

L’espace de travail simple pour organiser tes projets, tes clients et ton travail.

Site statique (aucune compilation) + Supabase pour la connexion et les données.
Le guide de mise en ligne est dans [LISEZ-MOI.md](LISEZ-MOI.md).

## Les plus

- **Tableau blanc** : dans chaque projet, un espace libre où poser des blocs, les déplacer et les relier entre eux. Les cartes du Kanban peuvent y être posées : un lien entre deux cartes indique laquelle doit être finie d’abord, et la suivante affiche « En attente de… ».
- **Chrono et rentabilité** : un chrono sur chaque carte de tes projets. Le temps reste privé ; avec le montant du projet, il donne ton taux horaire réel.
- **Point client** : un message d’avancement écrit à partir de tes cartes (terminé, en cours, prochaines étapes), à copier ou à ouvrir dans ta messagerie.

Ces trois fonctions n’ajoutent rien à la base de données : elles vivent dans `js/extras.js`.
