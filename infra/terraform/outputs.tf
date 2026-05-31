output "instance_name" {
  value = google_compute_instance.vm.name
}

output "zone" {
  value = google_compute_instance.vm.zone
}

output "external_ip" {
  description = "Ephemeral egress IP. NOT an ingress path (no allow rules)."
  value       = google_compute_instance.vm.network_interface[0].access_config[0].nat_ip
}

output "tailscale_hostname" {
  description = "Name to target from the Ansible inventory once the VM is up on the tailnet."
  value       = var.tailscale_hostname
}

output "service_account_email" {
  value = google_service_account.vm.email
}
