# Juste Debout School — app réseau

App élève des **Juste Debout Schools** (réseau multi-écoles : CORE, INDUSTRY, et les suivantes).
Application **séparée** de l'app événement Juste Debout, mais qui **partage le compte / l'authentification** (même projet Supabase).

- **Stack** : Expo SDK 57 · Expo Router (typed routes) · React Native 0.86 · Supabase.
- **Identité** : charte « Atelier / Affiche » propre à l'école (papier + encre), **système par campus** — CORE orange `#DE7A1A`, INDUSTRY cobalt `#2A3CC0`. Distincte de l'app événement (vert/noir).
- **Multi-tenant dès la ligne 1** : tout est scopé par école (`school_id`).

## Démarrer

```bash
npm install
cp .env.example .env   # renseigne les MÊMES valeurs Supabase que l'app événement
npm run ios            # ou: npm run android / npm run web
```

> Sans `.env`, l'app tourne en **mode démo** (données d'exemple) : le planning s'affiche sans backend.

## Backend

Dans le **même projet Supabase** que l'app événement (Supabase → SQL Editor → New query → Run),
exécute dans l'ordre :
1. `supabase/schema-jds.sql` — tables `jds_*` (écoles, studios, séances, cartes, réservations) + RLS + RPC `jds_book_session`, seed des deux écoles réelles.
2. `supabase/schema-vote.sql` — système de **vote communautaire** partagé école + événement (`polls` / `poll_candidates` / `poll_votes`) + RPC `cast_vote` + sondage de démo.
3. `supabase/schema-rankings.sql` — **classements** (profs open, profs formation, élèves) : registre de points `ranking_points` + view agrégée + RPC admin `ranking_add` (assiduité/retards/absences/jury/défis/bonus) + roster de démo.

Le tout réutilise `public.profiles` / `auth.users` → **compte partagé** (un vote unique par personne sur les deux apps).

## Où en est le projet

- **Fait** : socle multi-tenant (schéma + RLS), thème par campus, **Accueil** image-forward, **Planning** (réservation via RPC), **système de vote** communautaire (école + événement), nav à 5 onglets, i18n **FR/EN**, connexion (compte partagé), logos en placeholders (`Logo.tsx`).
- **Phase 1 (suite)** : wallet de cartes + achat/paiement (Stripe) + check-in QR. **Logos + photos réels fournis juste avant les paiements.**
- **Phase 2** : profil/progression, vidéos, communauté, passerelle événement.
- **Phase 3** : back-office par école, analytics, fidélité, mode franchise.

## À confirmer avec JDS

- Tarifs 2026 à jour (la grille seedée date de 2021-2022).
- INDUSTRY : capacité/studios ; **cartes partagées CORE ↔ INDUSTRY ou par campus** (le schéma supporte les deux ; défaut = par campus).
