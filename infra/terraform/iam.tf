# Let the VM ship container logs to Cloud Logging via the Docker `gcplogs`
# driver (no logging agent, ~0 RAM on the e2-micro). The instance uses its
# attached service account, which needs the log-writer role. Cloud Logging
# is free at this volume; logs survive a VM rebuild (cattle).
resource "google_project_iam_member" "vm_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.vm.email}"
}
