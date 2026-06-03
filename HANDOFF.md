# HANDOFF.md — Toto Mondiale

**AGGIORNAMENTO 2026-06-03 — slice #16 live + incidente Google + backlog resilienza.**
- **Slice #16 (Montepremi Finale / Mozzarella Counter):** chiusa e
  **deployata in prod** (commit `8959c36`, immagine GHCR digest
  `612d2850…`, VM gira quel digest, sito 307 → sign-in atteso). La
  scoreboard mostra, sotto "🏆 Tabellone" e prima della classifica, il
  banner "🧀 Montepremi Finale: <N Mozzarelle>" letto live da Airtable
  ("11. Counter" → `Mozzarella Counter`, formula `{Total Prediction Sets}
  * 5 & " Mozzarelle"`, stringa già formattata). Table ID e tipo campo
  **dedotti via Metadata API** (token locale), non chiesti a Cipo.
  Rimosso il vecchio sottotitolo del Tabellone. Dettagli → `CLAUDE.md`
  roadmap #16, `STATE.md`.
- **Incidente Google (2026-06-02):** account ad-hoc del progetto
  **sospeso automaticamente** per sospetta violazione ToS → appeal →
  reinstated, con upgrade a paid account richiesto. VM resta in Always
  Free (0 €). Dettaglio in `STATE.md` → "Incidente Google".
- **Backlog resilienza (idee, NON decise):** TD-1 failover prod su devbox
  (stesso container + 2º connettore `cloudflared` sullo stesso tunnel →
  failover Cloudflare senza DNS) e TD-2 emergency auth door (Credentials
  provider Auth.js dietro flag env OFF-by-default: email utente + password
  condivisa, authz invariato via Airtable Users, JWT/no-DB → **non**
  viola Google-only). Specifiche in `STATE.md` → "Backlog / resilienza".

**PAUSA 2026-06-01 (fine sessione) — BETA-READY. Si riprende domani.**
Tutte le slice #1–#15 chiuse, app live su `https://t0t0m0ndlale.online`.

**Stato lock Airtable (impostato da Roberto):** gironi **UNLOCKED** (fase
compilazione), knockout **LOCKED**.

**Pre-beta già fatto da Roberto:** base Airtable **duplicata** (backup),
**punti di test azzerati**.

**Dati tester (probe 2026-06-01):** Users = 6 (tutti con email → passano il
gate login). Prediction Sets = 4, tutte linkate: **Roberto (1), Claudio
Cipolletta (2), Andrea Navarro (1)**. Senza schedina: **Antonio Del Mondo,
Stefano Squillante, Abele Grillo** → se inclusi nel beta, Cipo deve
generare + linkare una schedina (campo `User`).

**⏳ UNICO percorso di scrittura NON ancora verificato — da testare domani
(Roberto):** il save dei "Pronostici speciali" (slice #15: Campione del
Mondo + Capocannoniere). Da una schedina **owner**: scegli campione +
nazione/giocatore → *Salva speciali* → verifica su Airtable "2. Prediction
Sets" che `Predicted World Cup Winner` / `Predicted Top Scorer` si
popolino. Se quei campi fossero lookup/read-only il PATCH fallirebbe → fix
lato Airtable (tipo campo). Tutti gli altri save (gironi, knockout) sono
già verdi end-to-end.

**DECISIONE visibility (Roberto) — NON è un bug, NON "fixare":** col
knockout lockato durante i gironi, `anyLocked=true`, quindi dal Tabellone è
possibile aprire l'overview altrui. Il knockout altrui è **bianco**
(bracket non ancora noto) → nessuna info. L'unico contenuto visibile
sull'overview altrui in fase 1 sono i "Pronostici speciali". Roberto ha
deciso che **va bene così per il beta**. (Se un domani li si volesse
segreti fino al lock gironi: gate della "vista altrui" su
`groupPredictionsLocked` invece di `anyLocked` in `lib/access.ts`
`resolveSetAccess` + `app/scoreboard/page.tsx`. Non farlo senza richiesta.)

**Piano beta a 7 step (Roberto):**
1. Accessi ai tester + schedine assegnate (fatto).
2. Tester compilano la fase 1: **gironi + Campione del Mondo + Capocannoniere**.
3. **Lock gironi** → si aggiungono i risultati (~4 partite ogni 10 min) →
   check che la classifica si aggiorni. NB: lo scoring "previsione esatta"
   è **Airtable** (formule/automation); l'app mostra i valori correnti **al
   refresh** (no push real-time). A fine partite: posizioni finali nei
   gironi + check classifica.
4. Si assegnano le **squadre qualificate** (Team A/B sui Knockout Match
   R32) → **unlock knockout** → i tester rientrano e compilano
   l'eliminazione (i round oltre R32 cascano dalle loro scelte).
5. **Lock knockout** → aggiornamento tabellone partita per partita + check.
   Dopo la finale: settare official **WC winner + capocannoniere** su
   Teams/Players → check classifica finale.
6. Check classifica finale.
7. **Reset del Toto** (ripristino dati Airtable dal duplicato) + feedback
   tester + risoluzione conflitti → apertura del gioco.

**Promemoria operativi per domani:**
- gcloud/terraform nel Bash non-interattivo: `export PATH="$HOME/google-cloud-sdk/bin:$PATH"`.
- Logging: `infra/scripts/tlogs app|cf|wt [N]` (config in `tlogs.env`, gitignored).
- Deploy di una fix: build su devbox → push GHCR → Watchtower autopull
  (~5 min) **oppure** `docker compose pull && up -d` via Tailscale per averlo subito.
- Working tree pulito, tutto su `origin/main`.

---

**Stato al 2026-06-01 sessione 9. 🎉 SLICE #11 CHIUSA — APP LIVE su
`https://t0t0m0ndlale.online`.** Deploy end-to-end completato dal control
plane devbox via Terraform (già applicato in sessione 8) + Ansible.

**Cosa è stato fatto oggi:**
- `ghcr-publish`: immagine `ghcr.io/pl1n10/toto-mondiale:latest` buildata
  sulla devbox e pushata su GHCR (**package privato**, confermato da
  Roberto). Login GHCR via PAT classic (`write:packages`).
- Secret risolti in `infra/ansible/` (tutti **gitignored**):
  - `inventory.ini`: host `100.70.123.70` (Tailscale), user `deploy`.
  - `group_vars/all.yml`: airtable/google OAuth riusati da `.env.local`,
    **`AUTH_SECRET` di prod FRESCO** (`openssl rand -base64 32`, NON il
    dev), `auth_url=https://t0t0m0ndlale.online`, `tunnel_token` (slice
    #10, preso da Cloudflare Zero Trust), `ghcr_*` (PAT recuperato dal
    `~/.docker/config.json` dopo il login).
- `ansible-playbook site.yml` verde (`failed=0`): hardening (swap 2 GB,
  sshd, unattended-upgrades, fail2ban) + Docker + app stack (app +
  cloudflared + watchtower). 3 container **Up e stabili**.
- Verifiche: `https://t0t0m0ndlale.online` → 307 (middleware → sign-in),
  `/sign-in` → 200, `/api/auth/providers` → Google con callback prod,
  tunnel cloudflared connesso (QUIC/HTTP2 pass). Nessuna porta pubblica.

**4 bug REALI corretti nell'IaC oggi (committati con questo step):**
1. `ansible.cfg`: callback `community.general.yaml` rimosso in v12 →
   `stdout_callback=default` + `result_format=yaml`.
2. `roles/app/tasks/main.yml`: app dir chownata a `{{ ghcr_user|lower }}`
   (`pl1n10`, utente di sistema inesistente) → `{{ ansible_user }}`
   (`deploy`).
3. `roles/hardening/tasks/main.yml`: `mkswap` rifaceva e falliva su
   re-run con `/swapfile` già montato → check `swapon --show` + `when`
   gate su format+enable (idempotente).
4. `roles/app/templates/docker-compose.prod.yml.j2`: watchtower
   `--poll-interval` (flag inesistente) → `--interval`; aggiunta env
   `DOCKER_API_VERSION=1.44` perché `containrrr/watchtower` negozia API
   Docker 1.25, troppo vecchia per il daemon nuovo (min 1.40).

**🆕 Slice #13 — vero dashboard per-utente (chiusa oggi).** Andando in
prod è emerso che `/dashboard` era un placeholder di debug: (1) statico,
quindi prerenderizzato al `docker build` senza env Airtable → mostrava
sempre il banner "mock data" e l'ID `recDebugMock000` congelati; (2) non
elencava le schedine dell'utente. Roberto ha scelto il dashboard reale.
- `lib/airtable/predictionSets.ts`: nuova `fetchPredictionSetsForUser(email)`
  — email sessione → `findUserByEmail` (Airtable Users) → filtra le
  Prediction Sets per `userId === me.id` (stessa ownership di
  `checkOwnershipGuard`/8f), ordina per `predictionNumber`. Mock path
  conserva un set fittizio quando Airtable non è configurato.
- `app/dashboard/page.tsx`: riscritta come server component **dinamico**
  (`export const dynamic = 'force-dynamic'` → legge env+sessione a
  runtime). Se Airtable è configurato e manca la sessione → `redirect`
  a `/sign-in`. Elenca "Le tue schedine" con link a
  `/prediction-set/[id]`; empty-state "contatta l'amministratore".
- Verde: typecheck + build (ora `/dashboard` è `ƒ Dynamic`, non più `○`).
  Immagine ribuildata + pushata su GHCR (digest `d304b0e…`), VM
  ridistribuita. Verificato in prod: `/dashboard` senza sessione → 307
  `/sign-in`, banner mock sparito (0 occorrenze). La **lista vera** è
  testabile solo dopo il login (slice #12).

**✅ Slice #12 — wiring OAuth prod (chiusa oggi).** Roberto ha aggiunto al
client OAuth Google `toto-mondiale-web` il redirect URI prod
(`https://t0t0m0ndlale.online/api/auth/callback/google`) + l'origin JS
(`https://t0t0m0ndlale.online`). **Login end-to-end verificato in prod**
(Roberto conferma; 0 errori nei log app). Il gate 8d (email in Airtable
Users) e il dashboard #13 ora sono percorribili dal vivo.

**🎉 PROGETTO COMPLETO E LIVE.** Tutte le slice #1–#13 chiuse. MVP in
produzione su `https://t0t0m0ndlale.online` (VM GCP e2-micro, Cloudflare
Tunnel, autodeploy Watchtower). Niente bloccanti aperti.

**Rifiniture UI (2026-06-01):** tasto **Esci** nel dashboard (server
action `signOut` → `/sign-in`); rimosso il record id grezzo dalle card
(si mostra solo il `name`); restyle coerente (sfondo a gradiente in
`layout.tsx`, header sticky, card emerald hover su dashboard, card +
logo Google su sign-in). Poi esteso a TUTTA l'esperienza: `AppHeader`
condiviso (brand + email + Esci) su dashboard e pagine prediction;
overview/gironi/knockout con header coerente e card; pill su palette
slate/emerald; SaveBar/LockBanner/ErrorState/LoadingState on-palette.
Build verde, immagine ridistribuita. Diagramma architettura in
`docs/architecture.md` (mermaid, render su GitHub).

**🆕 Slice #14 — Tabellone + bivio dashboard (chiusa 2026-06-01).**
Richiesta Roberto/Cipo. I punti ESISTONO GIÀ come campi numerici su "2.
Prediction Sets" (probe): `Group Match/Group Order/Knockout/Top Scorer/
World Cup Winner/Total Points` — calcolati da Airtable, noi solo letti.
- Mapping: 6 campi punti in `PREDICTION_SET_FIELDS`, tipo
  `PredictionPoints` + `PredictionSet.points`, `mapPredictionSet` li
  legge (default 0). Mock aggiornato.
- `fetchScoreboard()` in `predictionSets.ts`: lista TUTTE le schedine coi
  punti, ordina per `points.total` desc poi nome.
- `/dashboard` → **bivio** (2 card): 🏆 Tabellone (`/scoreboard`) e 📝 Le
  tue schedine (`/my-predictions`, dove è migrata la lista della #13).
- `/scoreboard`: tabella nome + 5 parziali (GM/GO/KO/TS/WC, nascosti su
  mobile) + Tot; leader (total>0) in ambra, riga propria in emerald +
  badge "Tu". Riga apribile (link a `/prediction-set/[id]`) se **propria**
  o se la schedina ha **una fase lockata** (riusa il gating 8f via
  `resolveSetAccess` sulla pagina target); altrimenti nome con 🔒 non
  cliccabile. Punti `force-dynamic` → refresh mostra lo stato corrente.
- Probe dati reali: 4 schedine, Cipolletta in testa (60 Group Order
  Points, dati di test), le altre a 0. Build verde, ridistribuita; le 3
  route nuove → 307 a sign-in senza login.
- NB visibility: il Tabellone (lista punti) è visibile a ogni utente
  loggato; il gate scatta solo sull'APERTURA di una schedina altrui.

**🆕 Slice #15 — Pronostici speciali (chiusa 2026-06-01).** Mancavano
Campione del Mondo + Capocannoniere. Decisione Roberto: posizione = sezione
nell'overview `/prediction-set/[id]`; capocannoniere = picker a 2 step
nazione→giocatore; lock in coppia coi gironi.
- Scrivono sul record di "2. Prediction Sets": `Predicted World Cup Winner`
  (→ Teams) e `Predicted Top Scorer` (→ Players), già mappati. Whitelist
  `PREDICTION_SET_WRITABLE_FIELDS` (antipattern). Save = singolo PATCH via
  `updateSpecialPredictions` (linked field: `[id]` per scegliere, `[]` per
  azzerare).
- Nuovi: `lib/airtable/players.ts` (`fetchPlayers`, mock incluso),
  `fetchTeams` in `teams.ts`, `mapTeam`/`mapPlayer`,
  `specialPredictionSchema`, action `saveSpecialPredictions`
  (`app/prediction-set/[id]/actions.ts`: Zod → ownership → lock 'group' →
  PATCH), client `components/predictions/SpecialPredictions.tsx`.
- Picker capocannoniere a 2 step: select nazione (solo team con ≥1 player)
  → select giocatore filtrato. Scala a ~1200 player (oggi 183) senza liste
  lunghe. Campione = select 48 squadre.
- `readOnly` = non-owner OPPURE `groupPredictionsLocked`. Build verde,
  immagine ridistribuita.
- ⏳ **Da fare (Roberto):** test salvataggio end-to-end da una schedina TUA
  (scegli campione + nazione/giocatore → Salva → verifica su Airtable che
  `Predicted World Cup Winner`/`Predicted Top Scorer` si popolino).

**Idee post-MVP (non bloccanti, da valutare con Roberto/Cipo):**
- Scoreboard "stage locked": quando Cipo blocca le fasi, il dashboard
  potrebbe mostrare anche le schedine altrui read-only (il visibility
  model 8f già lo supporta lato pagina; manca solo l'elenco nel
  dashboard). Highlight schedina vincitrice (UX da decidere con Cipo).
- Ruotare l'auth key Tailscale e/o il tunnel token (entrambi reusable).
- PAT GHCR read-only dedicato per la VM (oggi riusa quello write).
- Mirror Gitea homelab del repo (oggi solo GitHub).

**Nota sicurezza:** auth key Tailscale e tunnel token sono riutilizzabili.
Il tunnel token sta solo in `group_vars/all.yml` (gitignored) e in
`.env.production` sulla VM (mode 0600). File temp `~/.tt` sulla devbox da
cancellare (conteneva il tunnel token).

---

**Stato al 2026-05-31 sessione 8. Deploy ridisegnato come IaC dal
control plane (devbox).** Decisione: invece del setup manuale della VM,
le slice #11/#12 diventano **Terraform + Ansible** versionati in
`infra/`. Motivo strategico (Roberto): avere un **pattern DevOps
riutilizzabile** per altri progetti → i runbook generici diventano una
**famiglia di playbook in `minion`** (`templates/playbooks/gcp-deploy/`).
Modello scelto: *codice-nel-repo* (`infra/` concreto) + *playbook-spiega*
(markdown parametrico in minion). Forcelle decise: SSH via **Tailscale**,
state Terraform su **bucket GCS**, autodeploy via **Watchtower**.

**Cosa è stato scaffoldato (sessione 8), tutto verde:**
- `infra/terraform/`: VPC senza ingress, e2-micro + service account
  least-privilege, IP ephemeral solo-egress, startup-script che fa join
  Tailscale (`--ssh`), budget alert opzionale, backend GCS. **Verde:**
  `terraform init -backend=false && validate && fmt -check` OK.
- `infra/ansible/`: ruoli `hardening` (swap 2 GB, sshd, unattended-
  upgrades, fail2ban), `docker` (engine + compose plugin via
  deb822_repository), `app` (login GHCR, template compose+env, up,
  Watchtower poll). **Verde:** `ansible-lint` passa **profilo
  production** (0 failure) + `--syntax-check` OK. Variabili prefissate
  per ruolo (`hardening_`/`app_`); i secret stanno in `group_vars`/vault.
- `infra/README.md`: topologia + ordine operazioni + come validare
  offline. Compose/env di prod allineati a quelli root (slice #9) con
  l'aggiunta di Watchtower.
- **Logging (decisione: gcplogs + helper).** Container → **Cloud
  Logging** via driver Docker `gcplogs` (no agent, ~0 RAM; l'Ops Agent
  è escluso perché troppo pesante su 1 GB). SA con `roles/logging.logWriter`
  (`terraform/iam.tf`), API `logging.googleapis.com` da abilitare nel
  bootstrap. Driver parametrizzato `app_log_driver` (default `gcplogs`,
  `json-file` per target non-GCE) nel compose template. Helper devbox
  `infra/scripts/tlogs` (`app`/`all`/`cf`/`wt`/`raw` via `gcloud logging
  read`; `live`/`sys` via Tailscale SSH); config in `tlogs.env`
  (gitignored). Playbook minion `gcp-deploy/logging.md.tmpl`. Render del
  compose verificato (YAML valido, logging su tutti e 3 i servizi);
  ansible-lint production + terraform validate verdi.
- **minion** (`~/projects/minion`): famiglia `gcp-deploy/` (INDEX + 7
  playbook `.md.tmpl`: gcp-project-bootstrap, terraform-gce-vm,
  tailscale-join-vm, ghcr-publish, cloudflare-tunnel,
  vm-provision-ansible, oauth-prod-wiring). Suite minion verde (46
  passed). Nota in `TODO.md`: il discovery va reso ricorsivo per far
  emergere le famiglie (oggi `iterdir()` top-level non le vede → sono
  doc di riferimento, non rompono i test).

**Prossimo (slice #10–#12), ordine e chi fa cosa:**
1. **#10 (Roberto)**: dominio su Cloudflare (nameserver) + Tunnel su Zero
   Trust → tunnel token. Vedi playbook `cloudflare-tunnel`.
2. **Roberto, prerequisiti per far girare l'IaC**: progetto GCP + billing
   + `gcloud auth application-default login`; **auth key Tailscale**
   reusable taggata `tag:gcp` (+ regola ssh nell'ACL del tailnet);
   **PAT GHCR** write (push da devbox) e read (pull/Watchtower).
3. **#11 (Claude, quando arrivano i prerequisiti)**: `gcp-project-bootstrap`
   → `terraform apply` → `ghcr-publish` (build su devbox) →
   `ansible-playbook site.yml`.
4. **#12 (Roberto + Claude)**: redirect URI prod + JS origin sul client
   OAuth Google, test login end-to-end. Playbook `oauth-prod-wiring`.

**Tooling installato STABILMENTE sulla devbox (sessione 8):**
- `terraform` 1.9.8 → `~/.local/bin/terraform`
- `ansible-core` 2.21.0 + `ansible-lint` 26.4.0 → via **pipx**, shim in
  `~/.local/bin` (`ansible`, `ansible-playbook`, `ansible-galaxy`,
  `ansible-lint`, …). Collection Galaxy in `~/.ansible/collections`.
- `gcloud` (Cloud SDK 570.0.0) → rootless in `~/google-cloud-sdk`, PATH
  aggiunto in `.bashrc` (nuove shell lo trovano; `gcloud auth
  application-default login` ancora da fare — prereq slice #11).
Tutto permanente: niente più venv `/tmp`. Validazione `infra/` rifatta
verde dai binari stabili. (Aggiornata anche la tabella runtime nel
`~/.claude/CLAUDE.md` globale.)

**GCP bootstrap ESEGUITO (sessione 8) — slice #11 parte 1:**
- Account dedicato `t0t0m0ndlale010101@gmail.com`; progetto
  `toto-mondiale` (number `943229587559`); billing attivo (account
  `010620-50B760-DA5811`, crediti trail €257 fino al 28/08/2026).
- API abilitate: compute, iam, logging, cloudbilling, billingbudgets,
  storage, serviceusage.
- ADC create (`~/.config/gcloud/application_default_credentials.json`),
  quota project = `toto-mondiale`.
- Bucket state Terraform: `gs://rn-tfstate-943229587559` (us-central1,
  versioning on). `rn-tfstate` era già preso → suffisso col project
  number. `backend.tf` cablato, `terraform init` verde (gcs backend,
  provider google 6.50.0).
- **NB gcloud nel mio Bash non-interattivo:** non è nel PATH (l'installer
  lo mette in `.bashrc`, non caricato). Prefisso sempre
  `export PATH="$HOME/google-cloud-sdk/bin:$PATH"`.
- Budget alert opzionale: passare `billing_account_id=010620-50B760-DA5811`
  (+ `budget_amount_eur`) in tfvars per attivarlo (off di default).

**Tailscale (sessione 8) — FATTO da Roberto:**
- ACL del tailnet aggiornata: `tagOwners` con `tag:gcp` + una regola
  `ssh` `accept` (`src autogroup:member`, `dst tag:gcp`, `users
  deploy,root`). La regola `check`/`self` di default è rimasta.
- Auth key **reusable + pre-approved + tag `tag:gcp`** generata e messa in
  `infra/terraform/terraform.tfvars` (gitignored, riga `tailscale_authkey`).

**`terraform plan` VERDE:** 5 risorse da creare (VPC `toto-mondiale-net`,
subnet `10.10.0.0/24`, SA `toto-mondiale-vm@…`, IAM `logging.logWriter`,
istanza e2-micro). 0 change / 0 destroy. Budget escluso (billing
commentato).

**Auth account Google — RISOLTO:** l'account dedicato
`t0t0m0ndlale010101@gmail.com` era stato flaggato (gmail nuovo senza
telefono → token revocati, `invalid_grant` su ADC e CLI). **Roberto ha
aggiunto un recovery phone** → l'account è stato sbloccato, ADC e CLI
tornati validi. (Lezione comunque annotata nel playbook minion
`gcp-project-bootstrap`: per control-plane headless preferire SA key /
account rodato; il SA `terraform-cp` NON è stato creato, non è servito.)

**✅ `terraform apply` ESEGUITO — VM LIVE:**
- 5 risorse create. Istanza `toto-mondiale` (e2-micro, us-central1-a),
  IP egress `35.222.237.224`. SA `toto-mondiale-vm@…` con
  `logging.logWriter`. VPC/subnet senza ingress.
- **Join tailnet OK** (~100s dal boot): nome `toto-mondiale`, IP Tailscale
  **`100.70.123.70`**, `tagged-devices` (tag:gcp).
- **SSH via Tailscale verificato:** `ssh deploy@100.70.123.70` →
  `user=deploy`, `SUDO_OK` (sudo passwordless), `BOOTSTRAP_DONE`,
  tailscale 1.98.4. Nessuna porta pubblica, nessuna chiave (Tailscale SSH).
- State Terraform nel bucket GCS. `terraform.tfvars` (gitignored) ha
  project + tailscale_authkey.

**SECRET — quasi tutti GIÀ sulla devbox** (chiarito con Roberto: l'auth
Google dell'app è la slice 8b, già fatta). In `.env.local` ci sono già:
`AIRTABLE_API_TOKEN`, `AIRTABLE_BASE_ID`, `AUTH_GOOGLE_ID`,
`AUTH_GOOGLE_SECRET`, `AUTH_SECRET`, `AUTH_URL`. Per il deploy:
- Airtable + Google OAuth (ID/secret) → **riuso da `.env.local`**.
- `AUTH_SECRET` di prod → **generarne uno fresco** (`openssl rand -base64
  32`), non riusare quello di dev.
- `AUTH_URL` → `https://t0t0m0ndlale.online`.

**MANCA SOLO DA ROBERTO (2 cose):**
1. **PAT GitHub per GHCR** (`write:packages` + `read:packages`) →
   `ghcr-publish` (build su devbox + push) e pull/Watchtower sulla VM.
2. **Tunnel token Cloudflare** (slice #10): dominio `t0t0m0ndlale.online`
   aggiunto a Cloudflare (nameserver) → Tunnel su Zero Trust → token.

**SEQUENZA DI RIPRESA (domani):**
1. (Roberto) procura PAT GHCR + tunnel token.
2. `ghcr-publish` — `docker build` + push `ghcr.io/pl1n10/toto-mondiale:latest`.
3. Ansible: `inventory.ini` (host `100.70.123.70` o MagicDNS
   `toto-mondiale`, user `deploy`) + `group_vars/all.yml`/vault coi secret
   (riuso .env.local + ghcr_* + tunnel_token + AUTH_SECRET nuovo) →
   `ansible-playbook site.yml` (hardening+docker+app+cloudflared+watchtower).
4. Verifica tunnel Healthy + `https://t0t0m0ndlale.online`.
5. `oauth-prod-wiring` — aggiungere redirect prod
   `https://t0t0m0ndlale.online/api/auth/callback/google` + origin JS al
   client OAuth esistente, poi test login.

**Sicurezza auth key Tailscale:** è reusable e finisce in state/metadata.
Opzionale dopo il join: revocarla/rigenerarla dall'admin Tailscale (il
nodo resta su con la sua node key).

**PAUSA 2026-05-31:** stop a fine giornata, stato salvato. La VM è viva
e raggiungibile (`ssh deploy@100.70.123.70`). Per riprendere a freddo:
leggere questo blocco + `git log --oneline`. NB: `gcloud`/`terraform` nel
mio Bash non-interattivo vanno con
`export PATH="$HOME/google-cloud-sdk/bin:$PATH"`.

---

**Stato al 2026-05-29 sessione 7.** **Decisione architetturale grossa:
auth Google-only.** Roberto ha confermato che tutti gli invitati hanno
un account Google → magic-link/Resend ELIMINATO e con esso tutto lo
stack Prisma/SQLite (le sessioni sono ora **JWT, stateless**). Questo
sblocca 8e via middleware Edge banale e rende il deploy stateless.
**Slice #8 chiuso fino a 8e; resta solo 8f (visibility model).**

**Slice #8 COMPLETO** (8b+8d+8e+8f chiusi, 8c annullato). **Dominio
registrato: `t0t0m0ndlale.online`** (placeholder sostituiti ovunque).
**Deploy ridisegnato su GCP e2-micro Always Free + GHCR** (scelta
Roberto 2026-05-29, al posto di Hetzner). **Slice #9 (Dockerize)
chiuso** (smoke verde). **Prossimo: #10 (Roberto aggiunge il dominio a
Cloudflare → Tunnel token) + #11 (VM GCP + push GHCR + deploy).**

**Slice #9 (chiuso sessione 7) — Dockerize:**
- `next.config.mjs`: `output: 'standalone'`.
- `Dockerfile` multi-stage (`node:24-alpine`, deps→builder→runner,
  utente non-root `nextjs`), `.dockerignore`, `public/.gitkeep` (il
  COPY del runner lo richiede).
- `docker-compose.yml`: servizi `app` (immagine GHCR) + `cloudflared`,
  **nessuna porta host** (ingress solo via Tunnel), `env_file:
  .env.production`. App stateless → niente volume.
- `.env.production.example` committato; `.env.production` gitignored.
- **Smoke verde sulla devbox:** `docker build` OK (immagine 261 MB),
  `docker run` → sign-in 200, providers Google, `/prediction-set/*`
  307 (middleware attivo nel build standalone), ready 70ms.
- **Recipe push GHCR (per #11):**
  ```
  echo $GHCR_PAT | docker login ghcr.io -u Pl1n10 --password-stdin
  docker build -t ghcr.io/pl1n10/toto-mondiale:latest .
  docker push ghcr.io/pl1n10/toto-mondiale:latest
  ```
  (PAT classico con scope `write:packages`; rendere il package privato.)

**8f (chiuso in sessione 7) — visibility model:**
- `lib/access.ts`: `resolveSectionAccess` (pagine `/groups`,
  `/knockout`), `resolveSetAccess` (overview), `checkOwnershipGuard`
  (save action). Ownership = `PredictionSet.userId` (campo `User`, già
  mappato) vs id dell'utente loggato (email sessione → Airtable Users).
- Regola: **propria** → editabile se non lockata; **altrui + lockata**
  → read-only (vista scoreboard); **altrui + unlocked** → `notFound()`.
- Le 3 pagine chiamano l'helper col `set` GIÀ fetchato (no doppio
  fetch); `notFound()` è FUORI dal try così il segnale 404 propaga.
- `checkOwnershipGuard` aggiunto a `saveUnifiedGroupPredictions` e
  `saveKnockoutPredictions` (subito prima di `checkLockGuard`):
  difesa server-side, nessuna scrittura su schedine altrui.
- Probe Airtable: `Allowed Prediction Sets` su Users è un COUNT (=1),
  inutile; la fonte è `Prediction Sets.User`. Lock flags oggi tutti
  vuoti (fase unlocked).
- ⚠️ **Nota test:** con 8f attivo, per editare devi aprire una schedina
  TUA. Loggato come `robnovara@gmail.com` la tua è `recNmzrO4E7c0ZZEB`;
  `recnWpdJeglgnngOc` è di Cipo (unlocked) → 404. Punta
  `DEBUG_PREDICTION_SET_ID` alla tua, o logga come l'owner.

**Bloccanti esterni ancora aperti:**
- Cloudflare: dominio NON ancora aggiunto / nameserver da cambiare
  (Roberto) → sblocca Tunnel (#10).
- Tabella Users di Airtable: oggi **6 righe** popolate (incl.
  `robnovara@gmail.com` e `claudio.cipo23@gmail.com`), quindi 8d è
  testabile end-to-end. Nota: `abe.grillo@gmail.com` è duplicato su due
  righe — innocuo per il gate (presenza-only).

**Refactor Google-only (sessione 7) — cosa è cambiato:**
- `lib/auth.ts`: rimosso `PrismaAdapter`, `session.strategy = 'jwt'`,
  restano provider `Google` + callback `signIn` (gate 8d) + nuova
  callback `authorized` (gate 8e).
- `middleware.ts` (nuovo): `export { auth as middleware }` +
  matcher `/prediction-set/:path*`. Verde: route protetta senza auth →
  **307 → `/sign-in?callbackUrl=...`**; `/dashboard` resta 200.
- **Rimossi:** `lib/db.ts`, `prisma/` (schema+migration), `.env`,
  i deps `@auth/prisma-adapter`/`@prisma/client`/`prisma`/`resend`,
  gli script `db:*`/`postinstall`, le righe `AUTH_RESEND_*` da
  `.env.example`, le regole SQLite da `.gitignore`. 41 pacchetti via.
- Verde: typecheck + build (compare `ƒ Middleware`), providers/session
  curl OK. Test login browser demandato a Roberto.

**8d (chiuso in sessione 7) — cosa è stato fatto:**
- `lib/airtable/users.ts`: `findUserByEmail` (match in-memory
  case-insensitive, pattern D-007, ~20 righe) + `isInvitedEmail` che
  lascia il login aperto quando Airtable non è configurato (dev/mock).
- `lib/airtable/mappers.ts`: aggiunto `mapUser`.
- `lib/auth.ts`: callback `signIn` → `isInvitedEmail(user.email)`.
  `false` → Auth.js redirige a `/sign-in?error=AccessDenied`. Vale per
  OGNI provider. Regola: **solo presenza email**, `Active?` ignorato.
- `app/sign-in/page.tsx`: mostra banner rosso "non sei tra gli
  invitati" su `?error=AccessDenied`.
- Verde: typecheck + build. Test browser del percorso deny (gmail non
  in lista) demandato a Roberto.

**8d (chiuso in sessione 7) — cosa è stato fatto:**
- `lib/airtable/users.ts`: `findUserByEmail` (match in-memory
  case-insensitive, pattern D-007, ~20 righe) + `isInvitedEmail` che
  lascia il login aperto quando Airtable non è configurato (dev/mock).
- `lib/airtable/mappers.ts`: aggiunto `mapUser`.
- `lib/auth.ts`: callback `signIn` → `isInvitedEmail(user.email)`.
  `false` aborta prima della persistenza adapter e Auth.js redirige a
  `/sign-in?error=AccessDenied`. Vale per OGNI provider → gata anche il
  magic link (8c). Regola: **solo presenza email**, `Active?` ignorato.
- `app/sign-in/page.tsx`: mostra banner rosso "non sei tra gli
  invitati" su `?error=AccessDenied`.
- Verde: typecheck + build. Test browser del percorso deny (gmail non
  in lista) demandato a Roberto.

**8b (chiuso in sessione 7) — cosa è stato fatto:**
- `lib/auth.ts`: aggiunto `Google` ai providers (Auth.js v5 legge
  `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` dall'env in automatico).
- `app/sign-in/page.tsx`: server component, bottone "Accedi con
  Google" → server action `signIn('google', { redirectTo: '/dashboard' })`.
  Se già loggato → redirect `/dashboard`.
- `AUTH_URL=http://localhost:3000` pinnato in `.env.local` + documentato
  in `.env.example`. Serve perché il dev server gira `-H 0.0.0.0`
  (Tailscale) e senza pin Auth.js inferiva host `0.0.0.0`, rompendo il
  match col redirect URI registrato su Google.
- **Test da remoto via Tailscale:** SSH local-forward
  `ssh -L 3000:localhost:3000 hypn0@<tailscale-ip>` poi browser su
  `http://localhost:3000`. Google rifiuta IP nudi e http non-localhost
  come redirect URI, quindi l'IP Tailscale diretto NON funziona.
- **Footgun Prisma+SQLite risolto:** Prisma 6 risolve `file:./dev.db`
  rispetto alla cartella dello schema (`prisma/`), NON alla repo root.
  Esistevano due `dev.db` (root migrato vs `prisma/dev.db` vuoto che il
  runtime apriva → errore `Configuration` "table Account does not
  exist"). Fix: `prisma migrate deploy` su `prisma/dev.db`, rimosso il
  `dev.db` vagante in root, `.gitignore` aggiornato per ignorare
  `prisma/*.db` + sidecar WAL/journal. **L'unico DB valido ora è
  `prisma/dev.db`.**
- **Nota gate:** a questo stadio entra QUALSIASI account Google. Il
  blocco "email deve essere in Users di Airtable" è 8d, non ancora
  scritto.

**Decisioni prese in sessione 7 (2026-05-29):**

1. **Account Google dedicato** consigliato per il progetto GCP (owner
   unico per GCP + Resend + dominio), ma non bloccante.
2. **OAuth consent screen pubblicato in Production** con soli scope
   non-sensitive (email/profile/openid) → niente verifica Google,
   niente lista test-user. Il gating sui ~20 invitati resta l'allowlist
   Airtable (8d).
3. **Dominio dedicato** (no sottodominio di robertonovara.me).
4. **Esposizione via Cloudflare Tunnel** (`cloudflared`), nessuna porta
   aperta sul VPS Hetzner, TLS gestito da Cloudflare.
5. **Ordine:** il dominio dedicato sblocca anche Resend (8c). Quindi
   8b ora → registra dominio → 8c → 8d/8e/8f → deploy #9→#12.

**Decisioni chiuse in sessione 6 (riportate da Cipo):**

1. **"Match Status = Played" NON è un lock UX**. È solo un meccanismo
   Airtable per il conteggio punti: una partita played fa scattare il
   calcolo punteggi su Airtable per chi ha indovinato; non-played no.
   L'utente continua a modificare il pronostico fino a che la schedina
   intera non è bloccata via `Group/Knockout Predictions Locked?`.
   → Nessuna logica frontend da aggiungere su `Match Status`.
2. **Modello di visibilità per l'auth (slice futura):**
   - Stage **unlocked** (compilazione): user vede SOLO le sue schedine
   - Stage **locked** (torneo iniziato): user vede tutte (read-only su
     quelle altrui, accesso dal tabellone segna-punti tipo "click su
     Roberto1 → leggo la sua schedina")
3. **Highlight schedina vincitrice (stage 5):** prima riga del
   tabellone segna-punti in verde, le altre in bianco. UX minimal.

**Stato al 2026-05-27 fine sessione 5.** Tutte e tre le slice (Group
Match 1/X/2, Group Order 1·2·3·4, Knockout con cascata) chiuse
end-to-end contro Airtable reale. La sessione 5 ha sbloccato slice #3
con il go di Roberto sulle 3 decisioni UX (cascata invalidata, match
3/4, save check completezza), ha derivato la bracket topology dai Slot
Labels Airtable invece di hardcodarla, ha implementato la cascata
client-side con dot ambra e banner di errore in italiano.

## Stato git

- **Branch:** `main`
- **Ultimi commit:**
  - `3664d18` Add slice #8a: scaffold Auth.js v5 + Prisma + SQLite
  - `cff1d96` Drop legacy group pages after Cipo validated the unified flow
  - `26fd696` Fix slice #7: enrich group name on order predictions
  - `ec900bd` Add slice #7: unified Group Predictions page + soft completeness check
  - `e9621b8` Docs: reflect slices #4 and #5 (lock read-only + server-side guard)
- **Working tree:** docs unstaged (CLAUDE.md + HANDOFF.md). Da pushare.
- **Remote:** `origin` su `git@github.com:Pl1n10/toto-mondiale.git`
  (privato, branch `main` tracking). Mirror Gitea homelab ancora
  pending — bassa priorità.

## Cosa è verde end-to-end

### Slice #1 — Group Match Predictions ✅

- Modello **1 / X / 2** (Totocalcio): pill button per riga, niente
  score esatto. La scelta è da Cipo's schema (D-015).
- Read da Airtable reale: 72 righe per `recnWpdJeglgnngOc`, nomi
  squadra e gironi risolti via enrichment server-side (fetch
  parallelo Teams + Groups, mappa `id → name`).
- Save end-to-end verificato (7 record modificati salvati).
- Page: `/prediction-set/[id]/group-matches`.

### Slice #2 — Group Order Predictions ✅

- Pill button **1·2·3·4** per ogni squadra di ogni girone.
- **Duplicate-rank guard live**: appena si crea un conflitto nello
  stesso gruppo entrambe le righe diventano rosse, il SaveBar mostra
  un banner esplicativo, Save bloccato finché non si risolve.
  Validation duplicata server-side via `superRefine`.
- Save end-to-end verificato (4 record modificati, nessun duplicate
  residuo, tutti i 12 gironi coprono 1·2·3·4).
- Page: `/prediction-set/[id]/group-order`.
- Fix non banale lungo la strada (D-016 revisionata): `typecast: true`
  di Airtable coerce string→target, NON integer→text. Il service ora
  converte a stringa via `String(...)` prima del PATCH.

### Slice #3 — Knockout Predictions ✅

- **Caso B** (cascata frontend-side, conferma Cipo sessione 4) +
  **Predicted Team A/B sono lookup read-only**, quindi mai in PATCH.
  Il PATCH contiene solo `Predicted Winner`. La cascata vive interamente
  nello stato client.
- **Bracket topology derivata a runtime** dai `Slot A Label` / `Slot B Label`
  del Knockout Match table (sessione 5 scoperta durante il probe; non
  era stato menzionato da Cipo ma è già nei dati). Niente mappa
  hardcodata: parser in `lib/knockout/bracketTopology.ts` legge i label
  nel formato `^(Winner|Loser) Match (\d+)$` e fallisce in modo
  esplicito se Cipo cambia convenzione. Più robusto.
- **Match 3°/4°**: candidate = i due perdenti delle SF (via outcome
  `'loser'` nel parser). Funziona out-of-the-box senza casi speciali.
- **Cascata invalidata**: quando l'utente cambia un winner upstream
  e una scelta a valle non è più tra le candidate, `reconcileCascade`
  azzera quella scelta a valle e marca la riga con dot ambra
  "scelta da rifare" (tooltip). Iterativo: si propaga finché stabilizza.
- **Save check completezza**: al click di Save, se ci sono row senza
  `Predicted Winner`, niente PATCH; banner rosso in italiano
  ("Attenzione!!! Mancano delle squadre…") con conteggio, ogni row
  vuota riceve dot ambra "scelta mancante". Coerente col modello
  one-shot pre-lock.
- **Display**: 6 sezioni (R32 → Final), pill A/B per ogni match con
  i nomi delle candidate risolti dalla mappa `id → name` Teams. Pill
  disabilitata + tooltip "Complete previous round" finché upstream
  non è compilato.
- Page: `/prediction-set/[id]/knockout` (HTTP 200 contro Airtable
  reale, 32 match render con cascata coerente da winner pre-esistenti
  del test set `recnWpdJeglgnngOc`).
- **Save end-to-end verde in browser** (sessione 5): Roberto ha
  rimosso alcune scelte → banner "Mancano 5 scelte su 32" ✓ →
  ricompilato tutto → "Saved 14 predictions" → "No changes" ✓.
  PATCH reale verificato su Airtable. Slice #3 chiusa definitivamente.

### Slice #4 — Lock read-only ✅

- Le 3 pagine di editing leggono i flag `Group Predictions Locked?` /
  `Knockout Predictions Locked?` dal `Prediction Set` (fetch in
  parallelo con le predictions) e propagano `readOnly: boolean` ai
  componenti tabella.
- Quando un flag è `true`: banner `<LockBanner />` giallo in cima
  ("Schedina lockata — modifiche disabilitate"), tutti i pill
  `disabled`, SaveBar **nascosta**.
- Smoke test verificato: group flag locked → group-matches +
  group-order in read-only, knockout invariato (e viceversa). I due
  flag sono indipendenti come da D-022.
- Slice pronta per il test di Cipo del 28 maggio 2026.

### Slice #8 — Auth Google + Email + visibility model 🟡

Slice grande, decomposta in 6 sotto-step. Triggered da Roberto/Cipo
fine sessione 6: serve un login per poter applicare il visibility
model (ognuno vede le sue durante stage unlocked, tutte read-only
durante stage locked).

**Scelte UX confermate da Roberto (2026-05-28):**
- Login: **Google OAuth** + **Email magic link** (no password)
- SMTP per i magic link: **Resend** (free tier 100 mail/giorno)
- Sessioni: DB-backed via Prisma + SQLite (richiesta dal magic link)
- Onboarding: **blocca login se l'email non è già nella tabella
  Users di Airtable** ("non sei invitato — contatta l'admin"). Cipo
  popola la tabella manualmente per i 20 invitati.

**Stato sotto-slice:**

| # | Step | Stato | Bloccato da |
|---|---|---|---|
| 8a | Scaffold Auth.js (lo scaffold Prisma/SQLite poi rimosso) | ✅ | — |
| 8b | Google OAuth + pagina `/sign-in` | ✅ | — (login reale verificato) |
| 8c | ~~Email magic link via Resend~~ | ❌ annullato | Google-only |
| 8d | `signIn` callback: lookup Airtable Users, blocca se non presente | ✅ | — (6 righe Users, testabile) |
| 8e | Gating route `/prediction-set/*` (middleware Edge, sessioni JWT) | ✅ | — (307 verificato) |
| 8f | Filtro visibility: only-mine quando unlocked, all-read-only quando locked | ✅ | — (build verde; test owner/altrui demandato a Roberto) |

**Nota 8e (risolta dal refactor Google-only):** il problema "middleware
Edge non valida sessioni DB Prisma" è SPARITO perché non c'è più un DB —
le sessioni sono JWT, leggibili su Edge. Quindi 8e è un middleware
standard Auth.js (`export { auth as middleware }` + matcher), non serve
il layout-guard.

**8a (chiusa) — cosa è stato fatto** ⚠️ *SEZIONE STORICA: lo scaffold
Prisma/SQLite/Resend qui sotto è stato RIMOSSO nella revisione
Google-only del 2026-05-29. Tenuta solo come archivio.*
- Pacchetti installati: `next-auth@5.0.0-beta.31`,
  `@auth/prisma-adapter@2.11.x`, `prisma@^6`, `@prisma/client@^6`,
  `resend@^6`. Prisma 7 ha dato problemi col nuovo
  `prisma.config.ts` flow → pinnato a 6.x stabile.
- Schema Prisma standard Auth.js (`User` / `Account` / `Session` /
  `VerificationToken`). Migration `20260528153507_init_auth`
  applicata, SQLite in `./dev.db` (gitignored).
- `lib/db.ts` Prisma singleton (HMR-safe).
- `lib/auth.ts` config: adapter Prisma, `session.strategy = 'database'`
  (obbligatorio per il magic link), provider list vuota,
  `pages.signIn = '/sign-in'`.
- `app/api/auth/[...nextauth]/route.ts` re-exporta `handlers.GET/POST`.
- `.env.example` aggiornato con AUTH_SECRET / AUTH_GOOGLE_* / AUTH_RESEND_*.
- `.env.local` ha un AUTH_SECRET dev-only (rigenera in prod).
- Script `npm run db:migrate` / `db:generate` + `postinstall` su `prisma generate`.
- Smoke test: `/api/auth/session` → 200 `null`, `/api/auth/providers`
  → 200 `{}`, build production verde, /groups e /knockout invariati.

**Bloccanti esterni per proseguire con 8b/8c/8d (per Roberto e Cipo):**
1. **Roberto — Google OAuth Client su GCP:**
   - Crea progetto su `console.cloud.google.com`
   - Credentials → Create OAuth client ID → Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
     (+ URL prod quando si arriverà)
   - Annota `Client ID` + `Client secret` in `.env.local`
     (`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`)
2. **Roberto — Resend:**
   - Crea account su `resend.com` (free tier)
   - Verifica un dominio "from" (es. `noreply@robertonovara.me`)
   - Annota `AUTH_RESEND_KEY` + `AUTH_RESEND_FROM`
3. **Cipo — Airtable Users:**
   - ✅ Colonna aggiunta. Nome confermato via probe 2026-05-29:
     esattamente `Email` (coincide con `USER_FIELDS.email`, nessun
     tocco al mapping). Oggi 1/4 record valorizzati.
   - ⏳ Popola le email dei ~20 invitati (manca; ma per scaffoldare e
     testare 8d basta che ci sia l'email di login del tester).
   - ✅ Deciso con Cipo (2026-05-29): il gate 8d controlla **solo la
     presenza dell'email** in Users. `Active?` NON entra nella regola
     (niente blocco da quel campo). Per sospendere un invitato si
     rimuove la riga.

Quando arrivano (1) e (2), 8b + 8c sono lavoro di codice di una
sessione. Senza (3), 8d non è testabile end-to-end ma posso
comunque scaffoldarne la logica.

**Step manuali Google OAuth (per Roberto, sessione 7):**
1. console.cloud.google.com → New Project `toto-mondiale`.
2. OAuth consent screen → External → app name `Toto Mondiale`, support
   + developer email → scope SOLO `email` / `profile` / `openid` →
   **Publish App** (Production, no verifica Google).
3. Credentials → Create OAuth client ID → Web application
   `toto-mondiale-web`.
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
     (in prod si aggiunge `https://t0t0m0ndlale.online/api/auth/callback/google` → slice #12)
4. Copia Client ID + secret in `.env.local` come `AUTH_GOOGLE_ID` /
   `AUTH_GOOGLE_SECRET` (mai in repo).

## Roadmap deploy (slice #9 → #12)

Architettura target (ridisegnata 2026-05-29): VM **GCP e2-micro Always
Free** (Ubuntu 24.04, regione US) con **Docker Compose**, due container:
app Next.js standalone (immagine pullata da **GHCR**) + `cloudflared`.
**Cloudflare Tunnel** come ingress → nessuna porta aperta, TLS
Cloudflare. **App stateless** (sessioni JWT, niente DB): niente volume,
niente migrazioni, niente backup. L'immagine si builda sulla **devbox**
(la e2-micro a 1 GB andrebbe OOM su `next build`) e si pusha su GHCR;
la VM la scarica già pronta.

| # | Step | Stato | Bloccato da |
|---|---|---|---|
| 9  | Dockerize: `output:'standalone'`, Dockerfile multi-stage, compose (app + `cloudflared`) | ✅ | — (smoke verde, 261 MB) |
| —  | **IaC scaffold** (`infra/` Terraform+Ansible) + famiglia playbook minion `gcp-deploy` | ✅ | — (TF validate + ansible-lint production verdi) |
| 10 | `t0t0m0ndlale.online` → Cloudflare (nameserver) → Tunnel su Zero Trust → tunnel token | ⏳ | Roberto aggiunge a Cloudflare |
| 11 | `gcp-project-bootstrap` → `terraform apply` (VM + Tailscale join) → `ghcr-publish` (build su devbox) → `ansible-playbook site.yml` (hardening+docker+app+watchtower) | ⏳ | #10 + prereq GCP/Tailscale/PAT (Roberto) |
| 12 | Redirect URI prod + origin JS su client OAuth Google, test login end-to-end (`oauth-prod-wiring`) | ⏳ | slice #11 |

**Note:**
- e2-micro = 1 GB RAM: runtime OK per ~20 utenti, ma build solo su
  devbox. $300 di free-trial come paracadute per una e2-small in Europa
  se la micro è tirata o la latenza US dà fastidio.
- GHCR scelto da Roberto per impararlo: `ghcr.io/pl1n10/toto-mondiale`,
  auth via Personal Access Token (scope `write:packages`).
- Niente più Resend nel deploy (magic link annullato).

### Slice #7 — Unified Group page + completeness check opzione C ✅

- **Triggered da Cipo (sessione 6):** flippare tra `/group-matches` e
  `/group-order` per ricordarsi chi vince quante partite era scomodo.
  Soluzione: pagina unificata che per ogni gruppo mostra prima i 6
  match con 1/X/2, poi le 4 squadre con pill 1·2·3·4. UX-wise: vedi i
  segni e ragioni sulle posizioni nella stessa schermata.
- **Route:** `/prediction-set/[id]/groups` (nuova). Vecchie
  `/group-matches` e `/group-order` etichettate "(legacy)" nel
  dashboard `/prediction-set/[id]/page.tsx`. Resteranno vive finché
  Cipo non valida la nuova; dopo si cancellano.
- **Server action:** `saveUnifiedGroupPredictions` in
  `app/prediction-set/[id]/groups/actions.ts`. Valida payload (Zod,
  riusa schemas esistenti incluso `superRefine` duplicate-rank),
  esegue `checkLockGuard(..., 'group')` UNA volta, poi lancia in
  parallelo i due `update*Batch`. Ritorna `{ matches: BatchUpdateResult,
  order: BatchUpdateResult }` per gestire partial-failure indipendenti
  sui due lati.
- **Component:** `components/predictions/UnifiedGroupTable.tsx`.
  Tiene due `drafts` separati (match Map e order Map), un solo
  `dirtyCount`, una sola SaveBar. Conflict guard live per i duplicate
  rank già presente. `visibleMessage` priorità: conflicts > save
  message > "Mancano N predictions" (info banner sempre presente
  quando incompleto).
- **Completeness check (opzione C):** scelta UX di Cipo confermata da
  Roberto. Non bloccare il save incrementale — al click di Save, se
  `missingTotal > 0` parte `window.confirm`:
  > "Schedina incompleta: mancano N prediction (X partite, Y posizioni).
  > Salvare comunque la bozza?"
  Cancel → niente. OK → salva solo il dirty (esattamente come prima).
- **Knockout completeness:** stesso pattern in `KnockoutTable.tsx`.
  Il vecchio hard-block (mancano scelte → niente save) è stato
  sostituito con confirm dialog limitato a Finale + Terzo posto
  (`05 - Third Place`, `06 - Final`). Gli altri round sono già gated
  da "Complete previous round" → non serve check esplicito.
- **Smoke test:** HTTP 200 contro Airtable reale, 12 gruppi render
  (Group A..L), 120 radiogroup (72 match + 48 order). Knockout HTTP
  200, 32 match render, 6 fasi visibili. Save end-to-end in browser
  DEMANDATO A CIPO/Roberto per il test del 28 maggio.

### Slice #5 — Defense-in-depth server-side del lock ✅

- Helper shared `checkLockGuard(predictionSetId, kind)` in
  `lib/airtable/predictionSets.ts`: re-fetcha il PredictionSet e
  ritorna un messaggio di errore se il flag corrispondente è `true`,
  altrimenti `null`.
- Le 3 server action (`saveGroupMatch*`, `saveGroupOrder*`,
  `saveKnockout*`) chiamano `checkLockGuard` subito dopo la
  validazione Zod e prima del PATCH. Se lockato, ritornano
  `{ ok: false, error: "Schedina lockata: …" }` senza toccare
  Airtable.
- Chiude lo step (b) del rollout D-022. Niente test runtime esplicito:
  la slice protegge contro client malevoli che inviano payload
  direttamente alle server action, scenario che non emerge naturalmente
  da un click via UI (slice #4 nasconde già il bottone). Logica
  banale e già validata dal typecheck.

### Lessons learned sessione 5

1. **Probe Airtable: SEMPRE con paginazione.** Il probe iniziale aveva
   `pageSize=100` senza loop offset e mancava 7 record del set test,
   facendo credere che ci fosse un bug di Airtable automation
   (`25 records invece di 32`). In realtà i 32 c'erano: il bug era il
   probe. Lezione: usare `listAllRecords` style anche negli script
   ad-hoc, oppure forzare `pageSize=10` per testare il loop.
2. **Slot Labels sono già la topology.** L'idea originale era di
   hardcodare la mappa "match N → match M slot A/B" in
   `bracketTopology.ts`. Il probe ha rivelato che Airtable ha già
   `Slot A Label = "Winner Match 74"` etc. Derivare da lì è più
   robusto: se Cipo cambia un accoppiamento, l'app si adatta da sola.
3. **`Team A/B` dei round non-R32 sono dummy.** Cipo li ha lasciati
   compilati con dati di esempio (Spain in finale, ecc.). Non leggerli
   mai per round != R32; usare la cascata.

## Slice #3 — entry point archivio (cosa avevamo programmato)

**Sbloccato da Cipo a fine sessione 4** (risposta intera + decodifica
in `AIRTABLE_INFO_KNOCKOUT.md` → sezione "Risposta di Cipo").

### Modello previsto (preserved for reference)

- **Caso B** confermato da Cipo: cascata frontend-side. CON UNA
  CORREZIONE rispetto al piano originale: `Predicted Team A/B` sono
  **lookup read-only**, quindi NON li scriviamo. La cascata vive solo
  nello stato client.
- **Compilazione one-shot pre-lock** (chiarimento Roberto sessione 4):
  l'utente compila tutto il tabellone in un'unica sessione dopo i
  gironi, non round-per-round durante il torneo.
- PATCH contiene solo `Predicted Winner` per ogni match modificato.
- Per R16/QF/SF/F i campi `Predicted Team A/B` su Airtable restano
  vuoti — il browser mostra i nomi tramite la mappa `id → name`
  (Teams) combinata con il `Predicted Winner` dei round precedenti.
- L'utente NON può scegliere una squadra che non è nel match: il
  frontend mostra solo le 2 candidate pertinenti. Cipo non tocca
  niente in Airtable.

### Decisioni UX confermate (sessione 5, 2026-05-27)

1. **Cascata invalidata** → `null` + dot ambra "scelta da rifare".
   Coerente con stato "incomplete" generale della UI.
2. **Match 3°/4°** → candidate = i due perdenti delle SF
   (regola FIFA standard). Bracket topology deve esporre `loserOf(matchN)`.
3. **Save check di completezza** (nuovo, sessione 5): il bottone Save
   verifica che tutti i 32 `Predicted Winner` siano compilati. Se
   incompleto: banner di errore in alto ("Attenzione!!! Mancano delle
   squadre; prego ricontrollare il tabellone e inserire le mancanti.
   Grazie") + dot ambra sui match senza winner. Save bloccato finché
   non si completa. Coerente col modello one-shot pre-lock.

### Cosa fare nella prossima sessione

Slice #4 + #5 (lock read-only frontend + defense-in-depth server-side)
chiuse in sessione 5. D-022 step (a) e (b) implementati. Cipo può
testare il 28 maggio senza rischio che la UI o un client malevolo
scriva su una schedina lockata.

**Priorità alta — niente urgente**

Le feature core dell'MVP sono complete. La prossima slice naturale è
auth (D-022 step c), che è grande.

**Priorità media — decisioni / cleanup**

1. **D-018 helper field text**: indagare con Cipo perché
   `RECORD_ID()` non gli funziona; nel mentre l'in-memory filter
   (D-007) regge benissimo per 72/48/32 righe per fetch.

**Priorità bassa — feature grosse successive**

2. **Auth + visibility model** (slice grande, prerequisito hard per
   D-022 punto 4): scoping delle Prediction Sets per utente loggato;
   sblocca la "vista altrui" durante gli stage lockati.
3. **Deploy** — VPS Proxmox + Cloudflare Tunnel.
4. **Mirror Gitea homelab** (`origin` GitHub è già a posto).

### Cose ancora aperte con Cipo (non bloccanti)

- Feedback dal suo test del 28 maggio (lock gironi → calcolo punti →
  test fasi successive).
- Specifica "highlight schedina vincitrice" stage 5 — UX nice-to-have,
  non urgente.

## Cleanup minori pending (non bloccanti)

1. **Setup remote git** (Gitea + GitHub mirror) — Roberto domani.
   Identità `Pl1n10` / `robnovara@gmail.com`. Privato fino al lancio.
2. **Dev script `-H 0.0.0.0` in `package.json`** — Roberto lavora
   regolarmente via Tailscale, ricordarselo ogni volta non è ideale.
   Modifica banale.
3. ~~**Decisione UX "Played"**~~ — CHIUSO sessione 6: Played non è
   un lock UX, è solo per il calcolo punti su Airtable. L'utente
   modifica fino al lock della fase. Niente da implementare.
4. **D-018 helper field text** — `RECORD_ID()` non funziona per Cipo,
   ha messo `Prediction Set ID` come single-line text vuoto.
   Indagare con lui quando sarà comodo; nel mentre l'in-memory
   filter (D-007) regge benissimo per 72/48/32 righe per fetch.

## Workflow concordato con l'utente

- Italiano in chat, inglese nei commit message / identifier / codice
- Identità git: `Roberto Novara` / `robnovara@gmail.com`
- `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` nei commit
- Una vertical slice alla volta, end-to-end (vedi AP-011)
- HANDOFF aggiornato a fine step / fine sessione, stesso commit
- Mai esporre token Airtable al client (`'server-only'` import)
- Diff preview obbligatoria per modifiche all'adapter Airtable
- Token Airtable mai in chat, mai in repo — solo `.env.local` sulla
  devbox o canali privati. Scope richiesto:
  `data.records:read` + `data.records:write` (D-019).
- Save test end-to-end demandati a Roberto/owner; Claude verifica
  con probe manuali contro Airtable e dump comparativi quando serve

## Come verificare lo stato verde

```bash
npm run typecheck       # tsc --noEmit
npm run build           # next build → 6/6 routes OK (incl. /api/auth/[...nextauth])
npm run dev             # dev server -H 0.0.0.0 (gia' nello script)
npm run db:migrate      # solo se cambi prisma/schema.prisma
```

Smoke auth scaffold:
```bash
curl http://localhost:3000/api/auth/session     # → null
curl http://localhost:3000/api/auth/providers   # → {}
```

Smoke test runtime già verde (slice #1 e #2 con save end-to-end
contro Airtable reale; slice #3 verificato server-side, save in
browser demandato a Roberto in sessione 6).

## File da leggere per riprendere il filo (in ordine)

1. `~/.claude/CLAUDE.md` — istruzioni globali Roberto
2. `./CLAUDE.md` — istruzioni specifiche del progetto (roadmap status
   aggiornato in fondo)
3. `./HANDOFF.md` — **questo file** (stato corrente)
4. `./AIRTABLE_INFO_KNOCKOUT.md` — domande inviate a Cipo + piano
   esecutivo per ognuno dei 4 casi
5. `./DECISIONS.md` — D-015..D-019 contengono il razionale di tutte
   le scelte di sessione 3-4
6. `./ANTIPATTERNS.md` — AP-015 (typecast int→text) e AP-016 (build
   sopra dev) sono lesson learned di sessione 4
7. `./VOCABULARY.md` — Knockout labels Airtable esatte, Group Match
   Prediction è 1/X/2 (non score)
8. `git log --oneline -n 5` + `git status`
9. `./AIRTABLE_INFO.md` se servono dettagli sullo schema reale
   compilato da Cipo
