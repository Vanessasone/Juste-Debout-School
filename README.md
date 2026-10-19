# Juste Debout School — app réseau

App élève des **Juste Debout Schools** (réseau multi-écoles : CORE, INDUSTRY, et les suivantes).
Application indépendante : projet Supabase dédié `zmzunjphubbdumowcurk`, comptes, profils et sessions propres à School. Aucun transfert de session vers TOTF ou les applications événement.

- **Stack** : Expo SDK 57 · Expo Router (typed routes) · React Native 0.86 · Supabase.
- **Identité** : charte « Atelier / Affiche » propre à l'école (papier + encre), **système par campus** — CORE orange `#DE7A1A`, INDUSTRY cobalt `#2A3CC0`. Distincte de l'app événement (vert/noir).
- **Multi-tenant dès la ligne 1** : tout est scopé par école (`school_id`).

## Démarrer

```bash
npm install
cp .env.example .env   # renseigne uniquement les clés publiques du projet School dédié
npm run ios            # ou: npm run android / npm run web
```

> Sans `.env`, l'app tourne en **mode démo** (données d'exemple) : le planning s'affiche sans backend.

## Backend

Le projet de production School est `zmzunjphubbdumowcurk` (Paris). Ne jamais exécuter les anciens scripts d'initialisation dans le projet événement : ils décrivent l'architecture historique partagée et contiennent des données de démonstration.

Authentification : email/mot de passe. Google n'est pas activé. Site URL : `https://justedeboutschoolapp.netlify.app`; retours autorisés uniquement sur ce domaine. Stockage local de session : `jds-school-auth-v1`. Les comptes événement/TOTF ne sont pas importés automatiquement. Les profils sont créés par un trigger à l'inscription ; les rôles ne sont pas modifiables par les utilisateurs.

## Où en est le projet

- **Fait** : socle multi-tenant (schéma + RLS), thème par campus, **Accueil** image-forward, **Planning** (réservation via RPC), **système de vote** communautaire School, nav à 5 onglets, i18n **FR/EN**, connexion School indépendante, logos en placeholders (`Logo.tsx`).
- **Phase 1 (suite)** : wallet de cartes + achat/paiement (Stripe) + check-in QR. **Logos + photos réels fournis juste avant les paiements.**
- **Phase 2** : profil/progression, vidéos, communauté, espace School indépendant.
- **Phase 3** : back-office par école, analytics, fidélité, mode franchise.

## À confirmer avec JDS

- Tarifs 2026 à jour (la grille seedée date de 2021-2022).
- INDUSTRY : capacité/studios ; **cartes partagées CORE ↔ INDUSTRY ou par campus** (le schéma supporte les deux ; défaut = par campus).
