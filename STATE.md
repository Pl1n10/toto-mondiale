# STATE.md — snapshot corrente (LEGGI PER PRIMO)

> Cruscotto sempre-aggiornato: 30 secondi per allinearti a freddo.
> Narrativa per-sessione e storia → `HANDOFF.md`. Razionali architetturali
> → `DECISIONS.md`. Elenco slice → `CLAUDE.md` (in fondo).
>
> **Convenzione:** l'update quotidiano va QUI (è corto e a basso costo).
> `HANDOFF.md` si appende SOLO per decisioni/slice reali, non per
> housekeeping.

**Aggiornato:** 2026-06-03 (slice #16 — Montepremi Finale / Mozzarella Counter)

## In una riga
App completa e **LIVE** su `https://t0t0m0ndlale.online`. Slice #1–#16
chiuse (#16 = Montepremi Finale / Mozzarella Counter sulla scoreboard).
In attesa del **beta a 3 utenti**.

## Infra (dove gira / come intervenire)
- VM GCP e2-micro · Tailscale `100.70.123.70` · Cloudflare Tunnel ·
  Watchtower autodeploy · immagine `ghcr.io/pl1n10/toto-mondiale`
- **Incidente Google (2026-06-02):** account ad-hoc del progetto
  **sospeso automaticamente** da Google per sospetta violazione ToS
  (blocco automatico, non manuale). Appeal → **reinstated**. Google ha
  richiesto l'upgrade a **paid account** (condizione del reinstatement).
  Cipo ha chiuso il trial e impostato i **budget alert**. VM resta dentro
  l'**Always Free** (e2-micro / us-central1 / 30 GB pd-standard) →
  baseline 0 €. Motivazione ToS mai esposta (link "Cloud Logging" rotto,
  nessuna entry nei log). Se ricapita: la e2-micro NON si riaccende da
  sola, va dato `gcloud compute instances start toto-mondiale --zone us-central1-a`.
  → vedi **Backlog / resilienza** sotto: il rischio "Google ci stacca"
  è ciò che motiva il failover devbox + emergency auth door.
- Deploy di una fix: build su devbox → push GHCR →
  `docker compose pull && up -d` via Tailscale (o Watchtower ~5 min)
- Log: `infra/scripts/tlogs app|cf|wt [N]`
- gcloud/terraform nel Bash non-interattivo:
  `export PATH="$HOME/google-cloud-sdk/bin:$PATH"`

## Stato lock Airtable
- **Gironi: UNLOCKED** (compilazione) · **Knockout: LOCKED**

## ⏳ Prossima azione (l'unica cosa aperta)
- [ ] **Roberto:** test save "Pronostici speciali" (slice #15) da una
  schedina owner → verifica che `Predicted World Cup Winner` /
  `Predicted Top Scorer` si popolino su Airtable. Unico percorso di
  scrittura non ancora verificato.

## Beta — a che punto siamo
- **Step 1/7 fatto** (accessi + schedine assegnate). Prossimo: **step 2**
  (i tester compilano la fase 1). Piano completo a 7 step in `HANDOFF.md`.
- Tester pronti (in Users + schedina): **Roberto, Claudio, Andrea**.
  Senza schedina: Antonio Del Mondo, Stefano Squillante, Abele Grillo.

## Backlog / resilienza (idee, NON ancora decise — emerse dall'incidente Google)
- [ ] **TD-1 — Failover prod su devbox.** L'app è stateless +
  Dockerizzata + immagine su GHCR + Cloudflare Tunnel come ingress →
  failover quasi gratis: stesso container sulla devbox + un secondo
  connettore `cloudflared` con lo **stesso tunnel token**; Cloudflare
  instrada sui connettori sani (failover automatico, **niente cambio
  DNS**). Da decidere: warm-standby sempre acceso vs runbook on-demand;
  sync dei secret `.env` sulla devbox. Runbook candidato → famiglia
  `gcp-deploy` in `minion`.
- [ ] **TD-2 — Emergency auth door** (forma decisa, **piano pronto in
  HANDOFF**, non ancora buildata). Se Google OAuth cade, un flag env
  `EMERGENCY_AUTH` (OFF di default) abilita un **Credentials provider**
  Auth.js: l'utente entra con la **sua email** + una **password per-utente**.
  Hash salvato sul campo `Emergency Password Hash` di **Airtable Users**
  (lo store esiste già → **niente DB nuovo**, **niente Resend**). Authz
  **invariato** (email in Users, gate 8d; sessione JWT) → NON viola
  "Google-only / no DB" (è un 2º fattore di *authn* d'emergenza, non un
  ritorno a magic-link/Prisma). **Default: pw generata per tutti** (lo
  store è sempre armato) **+ self-set incoraggiato** (pagina gated-Google
  che la sovrascrive, banner nudge). Resend resta **fuori** (annotato come
  opzione futura non scelta). Piano step-by-step → `HANDOFF.md` "Piano TD-2".
- [ ] **TD-3 — Banner annunci admin da Airtable** (idea, NON ancora
  pianificata). Avvisi tipo "la fase 1 chiude tra 2 giorni" / "fase chiusa"
  / "fine torneo" mostrati **in-app** in cima a dashboard/scoreboard,
  pilotati da un campo testo che **Cipo edita su Airtable** (es. su "11.
  Counter" o una mini tabella "Announcements"); appare live (pagine già
  `force-dynamic`). Stesso pattern del Mozzarella Counter, **zero infra
  nuova / zero email / zero deliverability**. È l'alternativa a Resend per
  gli annunci di fase: **complementa** la mail/WhatsApp di Cipo (raggiunge
  chi apre l'app), non la sostituisce. Resend tenuto fuori (si ripagherebbe
  solo a centinaia di utenti + push-in-inbox + scadenze modellate a dato).

## Decisioni "non toccare" (sono scelte, non bug)
- **Visibility in fase 1:** col knockout lockato, l'overview altrui è
  apribile ma mostra solo i "Pronostici speciali" (il knockout è bianco).
  Roberto: **OK così, nessun fix.**
