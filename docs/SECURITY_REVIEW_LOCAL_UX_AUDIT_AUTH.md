# Revue de sécurité indépendante — Mécanisme local d'accès UX audit (commit `33554b7`)

**Portée** : lecture seule, aucune modification de code, aucun commit, aucun push, aucune session créée, aucun cookie posé, aucun appel réussi au endpoint de login.

---

## 1. Architecture d'authentification réelle

Le vrai flux (`app/login/page.tsx` → `POST /api/auth/send-magic-link` → email magique → `GET /api/auth/verify/route.ts?token=...`) :
1. `verifyMagicToken(token)` → extrait `email` d'un token signé à usage unique.
2. `getArtisanByEmail(email)` → lecture Supabase Postgres (table `users`, malgré le nom historique "Airtable") via `supabaseAdmin.ilike('email', ...)`.
3. `canAccessPlatformAccount({role, statut, billingStatus})` (`src/lib/auth-utils.ts:80`) → contrôle métier (admin, statuts bloqués/autorisés, billing).
4. `createToken(payload)` (`src/lib/auth-utils.ts:98`) → JWT `HS256`, `exp=7d`, signé avec `getAuthSecret()` = `AUTH_SECRET || NEXTAUTH_SECRET`.
5. `Set-Cookie: kadria-auth` — `httpOnly:true`, `secure: NODE_ENV==='production'`, `sameSite:'lax'`, `maxAge=7j`, `path:'/'`.
6. Lecture ultérieure : `middleware.ts` (`jwtVerify` avec le même secret) sur `/dashboard-v2`, `/onboarding`, `/admin`, `/login` ; `getSession()`/`getCurrentTenantContext()` re-valident le compte via `getAccountStatusForArtisan`.

## 2. Comparaison flux normal / flux audit

Identique bit-à-bit à partir de l'obtention de l'email : mêmes fonctions `getArtisanByEmail`, `canAccessPlatformAccount`, `createToken`, mêmes options de cookie (`app/api/dev/ux-audit-login/route.ts:56-112` vs `app/api/auth/verify/route.ts:20-82`). Seule différence : la façon dont l'email est authentifié en amont (token magique à usage unique vs garde serveur multi-conditions). Aucun claim JWT supplémentaire, aucun rôle élargi, aucune durée de validité étendue.

## 3. Analyse de la garde (`ux-audit-guard.ts`)

- `isUxAuditModeConfigured()` : exige `NODE_ENV !== 'production'` ET `KADRIA_LOCAL_REAL_AUDIT === 'true'` (comparaison stricte) ET `KADRIA_AUDIT_USER_EMAIL` non vide.
- `isLocalHostHeader()` lit uniquement `request.headers.get('host')` — jamais `X-Forwarded-Host` ni `Forwarded`. Un attaquant qui injecte `X-Forwarded-Host: localhost` n'a aucun effet (non lu, non utilisé). Correct.
- Sur Vercel, ce Host n'est pas falsifiable par un client distant. **Risque résiduel MOYEN (M-1)** : si l'application était un jour déployée derrière un reverse-proxy self-hosted/Docker mal configuré transmettant le Host client tel quel, la vérification pourrait être satisfaite artificiellement. Non exploitable dans l'architecture Vercel actuelle.
- `host.split(':')[0]` gère correctement `localhost:3000`. **Bug F-2** : `Host: [::1]:PORT` (IPv6 avec crochets) donnerait `[` au lieu de `::1` — faux négatif sans impact sécurité (fail-closed), juste une gêne d'usage.

## 4. Analyse de la route API

- Seule `GET` exportée → autres méthodes reçoivent un 405 natif.
- **Point vérifié avec rigueur maximale** : le compte réellement chargé et authentifié est TOUJOURS `auditEmail = getConfiguredAuditEmail()` (valeur d'environnement), jamais la valeur brute de la query string, même en cas de correspondance. Aucun email arbitraire client ne peut aboutir à un compte différent.
- Pas de choix de rôle/tenant/artisanId côté client. Pas de redirection ouverte (`redirectPath` toujours interne).
- Erreurs génériques, aucune fuite d'information.

## 5. Analyse du JWT

Algorithme `HS256`, même secret que le flux normal, expiration `7d` identique, claims tous dérivés du même enregistrement `artisan`, aucun claim influençable par le client. La route ne peut pas créer de token admin sauf si le compte de test configuré est lui-même Admin en base (risque organisationnel, pas applicatif).

## 6. Analyse du cookie `kadria-auth`

Options strictement identiques au flux normal. Aucun assouplissement. Aucun `Set-Cookie` émis si la garde échoue.

## 7. Analyse de la page locale

Server Component, garde exécutée avant rendu, 404 indistinguable d'une route inexistante en cas d'échec. Email affiché uniquement après validation complète de la garde. Aucun token dans l'URL. Bundle client vérifié vide de toute variable sensible (grep sur `.next/static`).

## 8. Analyse middleware

`middleware.ts` matcher n'inclut ni `/dev/*` ni `/api/dev/*` — confirmé par lecture directe. Toute la protection est interne aux fichiers. **Risque MOYEN (M-2)** : aucun filet de sécurité au niveau middleware/build ; un futur refactor du matcher pourrait exposer ces routes ou une suppression accidentelle de la garde romprait silencieusement l'isolation.

Point informatif : un mécanisme distinct (`KADRIA_LOCAL_UX_AUDIT`, nom très proche) existe déjà dans `middleware.ts` pour `/demo-dashboard`/`/demo-parametres` — risque de confusion opérationnelle (F-3), hors périmètre strict de ce commit.

## 9. Risques Preview/Vercel

`NODE_ENV=production` fixé par `next build` sur tous les déploiements Vercel (Production ET Preview) — le contrôle bloque donc les deux. Le Host vu en Preview serait `*.vercel.app`, jamais `localhost` — double barrage cohérent.

## 10. Risques proxy/Host spoofing

Confirmé en §3 : `X-Forwarded-Host`/`Forwarded` jamais lus. Scénario M-1 seul risque résiduel, non exploitable sur Vercel.

## 11. Risques CSRF

Route `GET` uniquement, compte fixe non choisi par le client. CSRF classique non applicable (pas de "victime" distincte possible). Risque FAIBLE (F-1).

## 12. Risques open redirect

`redirectPath` toujours une constante interne, jamais dérivée d'un paramètre client. Aucun risque.

## 13. Risques de privilèges

Rôle/plan/statut proviennent exclusivement de l'enregistrement réel associé à `KADRIA_AUDIT_USER_EMAIL`. Aucun choix de rôle/artisanId/tenant côté route.

## 14. Risques liés au compte de test

Si `KADRIA_AUDIT_USER_EMAIL` pointe par erreur vers un compte réel, risque organisationnel (accès local sans mot de passe pour l'opérateur ayant déjà accès au `.env.local`). Recommandation de contrôle organisationnel (compte non-Admin).

## 15. Secrets et exposition client

Aucune fuite trouvée dans le repo hors des fichiers du commit, ni dans le bundle client `.next/static`. Aucune variable `NEXT_PUBLIC_`.

## 16. Tests passifs effectués

Vérifications statiques uniquement (lecture de code) : matcher middleware, lecture exclusive de `Host`, email jamais pris du client pour l'auth réelle, `redirectPath` jamais dérivé du client. Aucun appel réel au endpoint, aucune variable d'audit activée.

## 17. Risques CRITIQUES

Aucun.

## 18. Risques ÉLEVÉS

Aucun.

## 19. Risques MOYENS

- **M-1** — `ux-audit-guard.ts` — Host non corrélé à l'IP de connexion réelle ; non exploitable sur Vercel, deviendrait un risque en cas de migration vers un reverse-proxy self-hosted mal configuré.
- **M-2** — `middleware.ts` — Aucun filet de sécurité build/CI ; toute la défense repose sur le code interne des 2 fichiers.

## 20. Risques FAIBLES

- **F-1** — CSRF théorique sans impact pratique.
- **F-2** — Parsing IPv6 `[::1]:PORT` non reconnu comme local (faux négatif, fail-closed, pas une faille).
- **F-3** — Confusion de nommage entre `KADRIA_LOCAL_UX_AUDIT` et `KADRIA_LOCAL_REAL_AUDIT`.

## 21. Corrections OBLIGATOIRES

Aucune.

## 22. Corrections RECOMMANDÉES (non bloquantes)

1. Documenter/imposer explicitement l'hypothèse de déploiement Vercel, ou ajouter une vérification d'IP de connexion en complément du Host (M-1).
2. Ajouter un test de build/CI vérifiant qu'en `NODE_ENV=production` sans variables, les routes renvoient 404 (M-2).
3. Clarifier la distinction `KADRIA_LOCAL_UX_AUDIT` vs `KADRIA_LOCAL_REAL_AUDIT` (F-3).
4. Corriger le parsing IPv6 avec crochets (F-2, cosmétique).

## 23. Décision finale

Aucun risque critique ou élevé. Le mécanisme reproduit strictement le flux d'authentification existant sans élargir les privilèges, ne peut authentifier qu'un compte fixe configuré côté serveur, n'expose aucun secret côté client, ne modifie pas le middleware, échoue de façon fermée sur chaque condition manquante, bloqué en Production et Preview Vercel.

## 24-26. Confirmations

Aucune session créée. Aucun code modifié. Aucun commit ni push effectué lors de cette revue.

---

## 27. Corrections appliquées après revue

Suite aux recommandations de la section 22, les actions suivantes ont été appliquées (commit `test: harden local UX audit authentication`) :

1. **Tests de non-régression ajoutés** — `src/lib/dev/__tests__/ux-audit-guard.test.ts` (21 tests unitaires, `node:test`, exécutés via `npm run test:ux-audit-guard`, aucune nouvelle dépendance installée — le projet n'avait aucune infrastructure de test préexistante, `node --test` avec `--experimental-strip-types` de Node 22 a été retenu). Un petit hook de résolution de module (`src/lib/dev/__tests__/server-only-shim.loader.mjs`) permet de résoudre l'import `server-only` (habituellement shimmé par le build Next.js) sans installer ce paquet ; il n'est actif que pendant les tests. Couverture : mode désactivé (3 tests), production (2), preview/non-local (2), email invalide (2), paramètres arbitraires non contrôlables (2), headers proxy jamais lus (2), cas nominal (2), `isLocalHostHeader` de base (2), parsing IPv6 (4). Les 21 tests ont réellement été exécutés et passent (`# pass 21`, `# fail 0`).
2. **Hypothèse Vercel documentée** — nouvelle section "Vercel deployment assumption (read before use)" dans `docs/LOCAL_REAL_PRODUCT_UX_AUDIT_ACCESS.md` : explicite que le contrôle `Host` n'est fiable que parce que Vercel ne transmet pas un `Host` client falsifié, que la garde doit être réévaluée en cas de migration vers un reverse-proxy self-hosted, et interdit explicitement l'exposition sur Internet ou via tunnel public.
3. **Clarification des variables** — nouveau tableau comparatif `KADRIA_LOCAL_UX_AUDIT` (démo, middleware, pas de session) vs `KADRIA_LOCAL_REAL_AUDIT` (produit réel, guard, crée une session `kadria-auth`) dans `docs/LOCAL_REAL_PRODUCT_UX_AUDIT_ACCESS.md`. Aucune variable renommée.
4. **Bug IPv6 confirmé et corrigé** — relecture précise de `host.split(':')[0]` : confirmé que `Host: [::1]:3000` produisait `hostname === '['`, donc un faux négatif (fail-closed, sans impact sécurité, juste une gêne d'usage documentée comme F-2). Correction appliquée dans `isLocalHostHeader()` (`src/lib/dev/ux-audit-guard.ts`) : si la chaîne commence par `[`, extraction de l'hôte jusqu'au `]` correspondant (comparé strictement à `::1`) ; sinon, comportement inchangé (split sur `:` existant, plus le cas `::1` nu sans crochets ni port, déjà couvert avant mais rendu explicite). Aucune autre logique d'hôte modifiée. Tests dédiés : `[::1]:3000` accepté, `[::1]` sans port accepté, `::1` nu accepté, `[2001:db8::1]:3000` (IPv6 non-loopback avec crochets) toujours rejeté.

### Statut des risques résiduels après corrections

| Risque | Statut avant | Statut après |
|---|---|---|
| M-1 (Host non corrélé à l'IP réelle, dépendance à Vercel) | Ouvert, non exploitable sur Vercel | **Ouvert mais désormais explicitement documenté** — hypothèse Vercel et limites en cas de migration décrites dans la doc d'accès. Reste un risque architectural intrinsèque à toute vérification basée sur `Host`, pas une faille corrigible dans ce commit sans changer l'architecture (hors périmètre de cette tâche). |
| M-2 (aucun filet de sécurité build/CI) | Ouvert | **Partiellement adressé** — des tests unitaires ciblés existent désormais et peuvent être branchés dans un pipeline CI (non fait dans ce commit : aucune configuration CI n'a été ajoutée/modifiée, hors périmètre explicite). Reste donc formellement ouvert en tant que "filet CI automatisé", mais un filet de test exécutable existe maintenant localement (`npm run test:ux-audit-guard`). |
| F-2 (bug parsing IPv6) | Ouvert | **Clos** — correction appliquée et testée (voir point 4 ci-dessus). |
| F-3 (confusion de nommage entre variables) | Ouvert | **Clos** — tableau comparatif explicite ajouté à la documentation ; aucun renommage effectué (hors périmètre demandé), la clarification est purement documentaire. |

### Décision finale (mise à jour)

Inchangée sur le fond : aucun risque critique ou élevé n'a été trouvé ni introduit par ces corrections. Les deux risques FAIBLES concrètement actionnables (F-2, F-3) sont désormais clos. Le risque MOYEN M-1 reste un risque architectural assumé et documenté (dépendance à l'hypothèse Vercel), le risque MOYEN M-2 est atténué par l'ajout de tests unitaires exécutables mais reste ouvert en l'absence de CI dédiée dans ce dépôt.

**MÉCANISME D'AUDIT AUTH — ACCEPTABLE EN L'ÉTAT, RISQUES RECOMMANDÉS DÉSORMAIS ADRESSÉS DANS LA MESURE DU PÉRIMÈTRE AUTORISÉ**
