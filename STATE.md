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
- **Billing (2026-06-02):** progetto freezato da Google per sospetta
  violazione ToS, appeal → **reinstated**. Google ha richiesto l'upgrade
  a **paid account** (condizione del reinstatement). Cipo ha chiuso il
  trial e impostato i **budget alert**. VM resta dentro l'**Always Free**
  (e2-micro / us-central1 / 30 GB pd-standard) → baseline 0 €. Motivazione
  ToS mai esposta (link "Cloud Logging" rotto, nessuna entry nei log).
  Se ricapita: la e2-micro NON si riaccende da sola, va dato
  `gcloud compute instances start toto-mondiale --zone us-central1-a`.
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

## Decisioni "non toccare" (sono scelte, non bug)
- **Visibility in fase 1:** col knockout lockato, l'overview altrui è
  apribile ma mostra solo i "Pronostici speciali" (il knockout è bianco).
  Roberto: **OK così, nessun fix.**
