# Remote state in a GCS bucket (decision: 2026-05-31, reusable pattern).
# The bucket must exist BEFORE `terraform init` — it is created once by the
# `gcp-project-bootstrap` playbook (gsutil mb + versioning on), not by this
# config (a backend cannot create its own bucket: chicken-and-egg).
#
# Fill the bucket name below, then run `terraform init`. Keep the prefix
# per-project so one bucket can hold many projects' state.
terraform {
  backend "gcs" {
    bucket = "rn-tfstate-943229587559" # created 2026-05-31, see gcp-project-bootstrap
    prefix = "toto-mondiale/vm"
  }
}
