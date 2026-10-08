/* Avancée — configuration du site. C'est le SEUL fichier à modifier avant la mise en ligne.
   Ces deux valeurs se trouvent dans Supabase : bouton « Connect », ou Settings > API Keys.
   La clé « publishable » (sb_publishable_...) est faite pour être publique : aucun risque à la laisser ici.
   Ne mets JAMAIS ici une clé « secret » (sb_secret_...) ni « service_role ». */
window.AVANCEE_CONFIG = {
  supabaseUrl: 'https://bmvxtwfucuskqojmmjuy.supabase.co',
  supabaseKey: 'sb_publishable_0K_VKJ4Uw5kcJKeFqvmNPw_I3Cmz8V8',
  providers: [],              // à remplir quand ils sont activés dans Supabase : ['google', 'discord']
  email: true,                // connexion par lien magique envoyé par e-mail
  contact: 'tomokari.perso@gmail.com'   // adresse (ou lien https://…) du bouton « Contacter » des formules Premium et Pro
};
