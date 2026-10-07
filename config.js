/* Avancée — configuration du site. C'est le SEUL fichier à modifier avant la mise en ligne.
   Ces deux valeurs se trouvent dans Supabase : bouton « Connect », ou Settings > API Keys.
   La clé « publishable » (sb_publishable_...) est faite pour être publique : aucun risque à la laisser ici.
   Ne mets JAMAIS ici une clé « secret » (sb_secret_...) ni « service_role ». */
window.AVANCEE_CONFIG = {
  supabaseUrl: '',            // ex. 'https://abcdefghijkl.supabase.co'
  supabaseKey: '',            // ex. 'sb_publishable_xxxxxxxxxxxxxxxxxxxx'
  providers: ['google', 'discord'],   // boutons de connexion affichés ; retire ceux que tu n'as pas activés dans Supabase
  email: true                 // connexion par lien magique envoyé par e-mail
};
