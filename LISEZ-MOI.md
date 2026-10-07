# Avancée — mettre le site en ligne

Ce dossier est le site complet. Il n'y a rien à compiler : ce sont des fichiers à déposer chez un hébergeur.
Il lui faut une base de données et un système de connexion : on utilise **Supabase** (gratuit pour démarrer).

Compte 30 à 45 minutes la première fois. Les noms de menus peuvent changer légèrement chez Supabase, Google ou Discord.

## Étape 1 — Créer la base (Supabase)

1. Va sur https://supabase.com, crée un compte, puis **New project**. Choisis une région proche (par exemple Paris ou Francfort) et note le mot de passe de la base.
2. Dans le projet, ouvre **SQL Editor > New query**.
3. Ouvre le fichier `supabase/schema.sql` de ce dossier, copie tout son contenu, colle-le, clique **Run**. Tu dois voir « Success ».
4. Récupère deux valeurs (bouton **Connect** en haut, ou **Settings > API Keys**) :
   - l'adresse du projet, du type `https://abcdefgh.supabase.co` ;
   - la clé **publishable**, du type `sb_publishable_...`.

Ne prends jamais la clé « secret » ni « service_role » : elles donnent tous les droits.

## Étape 2 — Relier le site à la base

Ouvre `config.js` avec un éditeur de texte et colle les deux valeurs entre les guillemets :

```js
supabaseUrl: 'https://abcdefgh.supabase.co',
supabaseKey: 'sb_publishable_xxxxxxxx',
```

Tant que tu n'as pas activé Google ou Discord (étape 5), retire-les de la liste : `providers: []`.
La connexion par e-mail fonctionne tout de suite.

## Étape 3 — Mettre en ligne (Netlify)

1. Va sur https://app.netlify.com/drop
2. Glisse **ce dossier entier** dans la page.
3. Netlify te donne une adresse du type `https://nom-au-hasard.netlify.app`. Crée un compte pour garder le site (sinon il n'est pas conservé), et renomme-le dans **Site configuration > Change site name**.

Pour mettre à jour plus tard : onglet **Deploys**, et glisse de nouveau le dossier.

## Étape 4 — Autoriser ton adresse dans Supabase

Dans Supabase : **Authentication > URL Configuration**.

- **Site URL** : l'adresse de ton site, par exemple `https://avancee.netlify.app`
- **Redirect URLs** : ajoute la même adresse.

Sans ça, la connexion te renvoie vers une page d'erreur.

Tu peux maintenant ouvrir ton site et te connecter par e-mail.

## Étape 5 — Activer Google et Discord (facultatif)

Dans les deux cas, l'adresse de retour à donner est :
`https://TON-PROJET.supabase.co/auth/v1/callback`
(Supabase l'affiche dans **Authentication > Sign In / Providers**, dans la fiche de chaque fournisseur.)

**Google**
1. https://console.cloud.google.com > crée un projet > **APIs & Services > OAuth consent screen** (type « External », remplis le nom et ton e-mail).
2. **Credentials > Create credentials > OAuth client ID > Web application**.
3. Dans **Authorized redirect URIs**, colle l'adresse de retour ci-dessus.
4. Copie le **Client ID** et le **Client secret** dans Supabase : **Authentication > Sign In / Providers > Google**, active, enregistre.

**Discord**
1. https://discord.com/developers/applications > **New Application**.
2. Menu **OAuth2** : dans **Redirects**, ajoute l'adresse de retour ci-dessus.
3. Copie le **Client ID** et le **Client Secret** dans Supabase : **Authentication > Sign In / Providers > Discord**, active, enregistre.

Puis remets dans `config.js` : `providers: ['google', 'discord']`, et redépose le dossier sur Netlify.

## Partager un projet

Ouvre un projet > **Partager** > entre l'adresse e-mail de la personne et choisis :

- **Lecteur** : voit le projet et ses cartes, ne modifie rien ;
- **Éditeur** : peut créer, déplacer et modifier les cartes, les colonnes et les labels.

Si un client avec une adresse e-mail est relié au projet, le site propose de l'inviter en un clic.

La personne se connecte au site **avec cette adresse** et retrouve le projet dans « Partagés avec moi ».
Aucun e-mail n'est envoyé automatiquement : envoie-lui le lien avec « Copier le lien du projet ».

Ce que les invités ne voient jamais, même en éditeur : ton Inbox, tes autres projets, tes clients, les montants et les notes privées. C'est le serveur qui l'impose, pas seulement l'affichage.

## Installer comme une appli

- **iPhone** : ouvre le site dans Safari > bouton Partager > « Sur l'écran d'accueil ».
- **Android / PC (Chrome, Edge)** : menu du navigateur > « Installer l'application ».

Le site a besoin d'une connexion Internet : il n'y a pas de mode hors ligne.

## Limites à connaître

- **E-mails de connexion** : l'envoi intégré de Supabase est limité à quelques e-mails par heure. Pour un vrai usage, branche ton propre service d'envoi dans **Authentication > Emails > SMTP Settings**.
- **Offre gratuite Supabase** : un projet sans activité pendant une semaine est mis en pause ; il se réactive depuis le tableau de bord.
- **Volume** : le site charge au plus 1 000 lignes par table. Au-delà, il faudra ajouter une pagination.
- **Paiement, offre Pro, notifications par e-mail** : pas encore faits.

## Contenu du dossier

| Fichier | Rôle |
|---|---|
| `index.html`, `app.css` | la page et ses styles |
| `config.js` | **le seul fichier à modifier** |
| `js/backend.js` | connexion et échanges avec Supabase |
| `js/i18n.js`, `js/lang-en.js` | les langues (français et anglais) |
| `js/core.js`, `ui.js`, `views.js`, `overlays.js`, `main.js` | l'application |
| `vendor/supabase.js` | bibliothèque Supabase (version figée) |
| `supabase/schema.sql` | tables et règles d'accès, à exécuter une fois |
| `manifest.webmanifest`, `icons/` | installation comme appli |

## Langues

Le site existe en **français** et en **anglais**. Il démarre dans la langue du navigateur (français si le navigateur est en français, anglais sinon). On change de langue sur la page de connexion (boutons FR / EN) ou dans **Réglages > Apparence et langue**. Le choix est mémorisé sur l'appareil.

Seule l'interface est traduite : les noms de projets, les tâches et les notes restent tels qu'ils ont été écrits.

Pour ajouter une langue : copie `js/lang-en.js`, traduis les textes de droite, ajoute le fichier dans `index.html` et la langue dans `I18N.langs` (`js/i18n.js`).
