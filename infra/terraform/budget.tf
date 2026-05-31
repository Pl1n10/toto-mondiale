# Optional budget alert. Created only when billing_account_id is set, because
# google_billing_budget needs the billing account ID and the Budget API
# enabled (done in gcp-project-bootstrap). Thresholds: 50% / 90% / 100%.
resource "google_billing_budget" "budget" {
  count = var.billing_account_id == "" ? 0 : 1

  billing_account = var.billing_account_id
  display_name    = "${var.instance_name} budget"

  budget_filter {
    projects = ["projects/${var.project_id}"]
  }

  amount {
    specified_amount {
      currency_code = "EUR"
      units         = var.budget_amount_eur
    }
  }

  threshold_rules {
    threshold_percent = 0.5
  }
  threshold_rules {
    threshold_percent = 0.9
  }
  threshold_rules {
    threshold_percent = 1.0
  }
}
