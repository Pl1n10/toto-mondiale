# Architettura — Toto Mondiale

Dove buildiamo, per dove passa il traffico, dove gira, cosa esponiamo.

```mermaid
flowchart LR
    user(["👤 Utente<br/>browser"])

    subgraph DEV["🖥️ Devbox — control plane"]
        direction TB
        build["🔨 docker build<br/>next build (standalone)"]
        iac["📜 Terraform + Ansible"]
    end

    subgraph EXT["☁️ Servizi gestiti"]
        direction TB
        ghcr[["📦 GHCR<br/>ghcr.io/pl1n10/toto-mondiale<br/>(private)"]]
        google(["🔑 Google OAuth"])
        airtable[("🗃️ Airtable<br/>base appPV77…<br/>(DB / user store)")]
    end

    subgraph CF["🌩️ Cloudflare"]
        direction TB
        dns["DNS + TLS<br/>t0t0m0ndlale.online"]
        edge["Edge / Tunnel<br/>(Zero Trust)"]
    end

    subgraph GCP["🟦 GCP — VM e2-micro Always Free (us-central1)"]
        direction TB
        cfd["cloudflared<br/>(connector)"]
        app["app<br/>Next.js 14 :3000<br/>(stateless, JWT)"]
        wt["Watchtower<br/>autodeploy"]
        cfd --> app
    end

    logs[["📊 Cloud Logging<br/>(driver gcplogs)"]]

    %% --- Build & deploy (una tantum / ad ogni release) ---
    build -- "push :latest" --> ghcr
    iac == "provision VM + deploy<br/>(SSH over Tailscale 🔒)" ==> GCP
    wt -. "poll & pull :latest" .-> ghcr

    %% --- Runtime: ingress pubblico ---
    user == "HTTPS" ==> dns --> edge
    edge == "tunnel cifrato<br/>(nessuna porta aperta)" ==> cfd

    %% --- Runtime: dipendenze server-side ---
    app -- "token server-side" --> airtable
    app -- "login (authn)" --> google
    app -. "stdout/err" .-> logs

    classDef dev fill:#ecfdf5,stroke:#10b981,color:#064e3b;
    classDef cloud fill:#eff6ff,stroke:#3b82f6,color:#1e3a8a;
    classDef gcp fill:#f1f5f9,stroke:#64748b,color:#0f172a;
    classDef ext fill:#fff7ed,stroke:#f59e0b,color:#7c2d12;
    class DEV dev;
    class CF cloud;
    class GCP gcp;
    class EXT,logs ext;
```

## Come leggerlo — le 3 catene

### 1. Build & deploy (dalla devbox)

- La **devbox** builda l'immagine (la e2-micro andrebbe OOM su `next build`)
  e la **pusha su GHCR** come `:latest`.
- **Terraform** crea la VM, **Ansible** la configura e avvia lo stack — tutto
  via **SSH over Tailscale** (nessuna porta SSH pubblica).
- **Watchtower** sulla VM fa poll di GHCR e ri-pulla `:latest` da solo →
  autodeploy ad ogni nuova immagine.

### 2. Ingress pubblico (cosa esponiamo)

- Utente → **HTTPS** su `t0t0m0ndlale.online` → **Cloudflare** (DNS + TLS) →
  **Tunnel cifrato** → container `cloudflared` → `app:3000`.
- Punto chiave: **la VM non ha NESSUNA porta aperta**. Il traffico entra solo
  "tirato dentro" dal tunnel. Niente IP pubblico esposto, niente firewall
  ingress.

### 3. Dipendenze runtime (server-side)

- `app` → **Airtable** col token che **resta sul server** (mai al client).
- `app` → **Google OAuth** per il login (poi sessione **JWT, stateless** →
  niente DB sulla VM).
- `app` → **Cloud Logging** via driver `gcplogs` (log senza agent, leggibili
  dalla devbox con `infra/scripts/tlogs`).

## In una riga

Buildiamo sulla **devbox** → distribuiamo su **GHCR** → gira su una **VM GCP
Always Free** → esponiamo solo via **Cloudflare Tunnel** (zero porte aperte),
con **Airtable** come DB e **Google** per il login.
