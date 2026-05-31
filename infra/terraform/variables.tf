variable "project_id" {
  type        = string
  description = "GCP project ID hosting the VM."
}

variable "region" {
  type        = string
  description = "Region. Must be a free-tier region for the e2-micro to stay free."
  default     = "us-central1"

  validation {
    condition     = contains(["us-west1", "us-central1", "us-east1"], var.region)
    error_message = "Always Free e2-micro only exists in us-west1, us-central1, us-east1."
  }
}

variable "zone" {
  type        = string
  description = "Zone within the region."
  default     = "us-central1-a"
}

variable "machine_type" {
  type        = string
  description = "e2-micro is the Always Free shape. Bump to e2-small only on the $300 trial."
  default     = "e2-micro"
}

variable "instance_name" {
  type    = string
  default = "toto-mondiale"
}

variable "boot_disk_gb" {
  type        = number
  description = "Always Free includes 30 GB-months of standard PD. Stay at 30."
  default     = 30
}

variable "image_family" {
  type    = string
  default = "ubuntu-2404-lts-amd64"
}

variable "image_project" {
  type    = string
  default = "ubuntu-os-cloud"
}

# --- Tailscale (channel for Ansible; the VM has no public SSH) -----------
variable "tailscale_authkey" {
  type        = string
  description = "Reusable, pre-authorized, tagged auth key (tag:gcp). Sensitive — pass via tfvars or TF_VAR_, never commit."
  sensitive   = true
}

variable "tailscale_hostname" {
  type    = string
  default = "toto-mondiale"
}

variable "ssh_admin_user" {
  type        = string
  description = "OS user created on the VM for Ansible over Tailscale SSH."
  default     = "deploy"
}

# --- Budget alert (optional; needs billing account + budget API) ---------
variable "billing_account_id" {
  type        = string
  description = "Billing account ID for the budget alert. Leave empty to skip the budget resource."
  default     = ""
}

variable "budget_amount_eur" {
  type    = number
  default = 1
}
