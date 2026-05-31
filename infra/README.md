# infra/ — control plane for the GCP deploy

This directory is the **concrete** Infrastructure-as-Code for Toto Mondiale's
deploy (slices #10–#12). The devbox is the control plane: Terraform provisions
the VM, Ansible configures it and deploys the app.

The **reusable, project-agnostic knowledge** lives as runbooks in `minion`
(`src/minion/templates/playbooks/`). This code is the first real instance that
those playbooks describe. When you start the next project, read the playbooks,
copy this `infra/` shape, and re-fill the parameters.

## Topology

```
devbox (control plane)
  ├─ terraform/  -> GCP: VPC (no ingress), e2-micro VM, SA, budget
  │                 startup-script joins the VM to Tailscale
  └─ ansible/    -> over Tailscale SSH: hardening, docker, app deploy
                     app stack = app + cloudflared + watchtower

GCP e2-micro (1 GB, Always Free, US region)
  - no open inbound ports
  - reached by:  app  -> Cloudflare Tunnel (cloudflared, egress)
                 admin -> Tailscale SSH (egress)
  - app image pulled from GHCR (built on the devbox, never on the VM)
  - Watchtower polls GHCR and auto-updates :latest
  - container logs -> Cloud Logging (gcplogs driver, no agent)
```

## Logging

Container `stdout/stderr` ship to **Cloud Logging** via the Docker
`gcplogs` driver (no agent, ~0 RAM; the VM's service account gets
`roles/logging.logWriter` in `terraform/iam.tf`). Logs are durable and
survive a VM rebuild. Read them from the devbox with the helper:

```bash
cp scripts/tlogs.env.example scripts/tlogs.env   # fill TOTO_PROJECT etc.
scripts/tlogs app            # last cloud entries for the app container
scripts/tlogs all 200        # all containers
scripts/tlogs live           # real-time tail over Tailscale SSH
scripts/tlogs sys            # journald over Tailscale SSH
```

The driver is set per-service in the app role template (`app_log_driver`,
default `gcplogs`; use `json-file` for a non-GCE target). See the minion
`logging` playbook for the full rationale.

## Order of operations

1. **gcp-project-bootstrap** — project, billing, ADC, enable APIs, create the
   GCS state bucket, (optional) budget API. *Manual / playbook.*
2. **terraform** — `cd terraform && terraform init && terraform apply`.
   Provisions the VM; it joins the tailnet on first boot.
3. **ghcr-publish** — on the devbox: `docker build` + `docker push` to GHCR.
4. **cloudflare-tunnel** — create the tunnel in Zero Trust, get the token.
5. **ansible** — `cd ansible && ansible-playbook site.yml`. Hardens the box,
   installs Docker, deploys the stack with the tunnel token + secrets.
6. **wiring** — add the prod redirect URI to the Google OAuth client.

Logging is cross-cutting: the IAM role is in `terraform/`, the API is
enabled in bootstrap, the driver is set by the ansible app role, and you
read it with `scripts/tlogs`.

Each numbered step has a matching playbook in `minion`.

## Secrets

Nothing secret is committed. Templates end in `.example`; the resolved files
(`terraform.tfvars`, `ansible/inventory.ini`, `ansible/group_vars/all.yml`)
are gitignored. Prefer `TF_VAR_*` env vars and Ansible Vault over plaintext.

## Validate without touching GCP

```bash
cd terraform && terraform init -backend=false && terraform validate && terraform fmt -check
cd ../ansible && ansible-lint && ansible-playbook site.yml --syntax-check
```
