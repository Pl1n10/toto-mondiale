# Dedicated VPC with NO ingress allow rules. GCP's implied rule denies all
# ingress by default, so the VM has zero open inbound ports. Reachability:
#   - app traffic  -> Cloudflare Tunnel (cloudflared dials out, egress only)
#   - admin/SSH     -> Tailscale (overlay, egress-initiated)
# Egress is allowed by the implied rule (needed for tailscale, GHCR, Cloudflare).
resource "google_compute_network" "vpc" {
  name                    = "${var.instance_name}-net"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name          = "${var.instance_name}-subnet"
  ip_cidr_range = "10.10.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id
}

# Least-privilege service account for the VM. No keys are emitted; the VM
# uses its attached identity. Scope is intentionally minimal.
resource "google_service_account" "vm" {
  account_id   = "${var.instance_name}-vm"
  display_name = "${var.instance_name} VM runtime identity"
}

resource "google_compute_instance" "vm" {
  name         = var.instance_name
  machine_type = var.machine_type
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "${var.image_project}/${var.image_family}"
      size  = var.boot_disk_gb
      type  = "pd-standard" # Always Free covers standard PD, not SSD.
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.subnet.id
    # Ephemeral external IP: needed for egress (Tailscale/GHCR/Cloudflare).
    # No ingress is possible anyway — there are no allow rules on the VPC.
    access_config {}
  }

  # Joins the tailnet on first boot so Ansible can reach it. The auth key is
  # injected here; it never lands in state output (the script is rendered,
  # the key is marked sensitive on the variable).
  metadata_startup_script = templatefile("${path.module}/startup-script.sh.tftpl", {
    tailscale_authkey  = var.tailscale_authkey
    tailscale_hostname = var.tailscale_hostname
    ssh_admin_user     = var.ssh_admin_user
  })

  service_account {
    email  = google_service_account.vm.email
    scopes = ["cloud-platform"]
  }

  # Free-tier hygiene: standard network tier keeps egress in the free bucket.
  labels = {
    project = var.instance_name
    managed = "terraform"
  }

  allow_stopping_for_update = true
}
