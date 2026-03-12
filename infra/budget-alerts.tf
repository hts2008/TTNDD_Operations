# ──────────────────────────────────────────────────────────────
# TTNDD_Ops — GCP Billing Budget Alerts
# ──────────────────────────────────────────────────────────────
# This file defines budget alerts for the TTNDD_Ops GCP project.
# Apply with: gcloud billing budgets create (see runbook)
#
# Alternatively, use the gcloud CLI commands in the runbook
# if Terraform is not available in your environment.
# ──────────────────────────────────────────────────────────────

# ─── Variables ───────────────────────────────────────────────

variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "ttndd-ops-prod"
}

variable "billing_account_id" {
  description = "GCP Billing Account ID"
  type        = string
}

variable "monthly_budget_vnd" {
  description = "Monthly budget in VND"
  type        = number
  default     = 800000 # 800,000 VND
}

variable "notification_emails" {
  description = "Email addresses for budget alerts"
  type        = list(string)
  default     = ["admin@ttndd.org"]
}

# ─── Pub/Sub Topic for Budget Notifications ──────────────────

resource "google_pubsub_topic" "budget_alerts" {
  project = var.project_id
  name    = "budget-alerts"

  labels = {
    environment = "production"
    managed_by  = "terraform"
    purpose     = "billing-budget-notifications"
  }
}

# ─── Budget with 4 Threshold Alerts ─────────────────────────

resource "google_billing_budget" "ttndd_monthly" {
  billing_account = var.billing_account_id
  display_name    = "TTNDD_Ops Monthly Budget"

  budget_filter {
    projects = ["projects/${var.project_id}"]
  }

  amount {
    specified_amount {
      currency_code = "VND"
      units         = var.monthly_budget_vnd
    }
  }

  # ── Threshold 1: 50% — Informational ──
  threshold_rules {
    threshold_percent = 0.50
    spend_basis       = "CURRENT_SPEND"
  }

  # ── Threshold 2: 80% — Warning (trigger optional module disable) ──
  threshold_rules {
    threshold_percent = 0.80
    spend_basis       = "CURRENT_SPEND"
  }

  # ── Threshold 3: 100% — Critical (trigger read-only mode) ──
  threshold_rules {
    threshold_percent = 1.00
    spend_basis       = "CURRENT_SPEND"
  }

  # ── Threshold 4: 120% — Emergency (trigger kill-switch) ──
  threshold_rules {
    threshold_percent = 1.20
    spend_basis       = "CURRENT_SPEND"
  }

  # ── Notifications ──
  all_updates_rule {
    pubsub_topic                     = google_pubsub_topic.budget_alerts.id
    schema_version                   = "1.0"
    monitoring_notification_channels = []
    disable_default_iam_recipients   = false
  }
}

# ─── Pub/Sub Subscription for API webhook ────────────────────

resource "google_pubsub_subscription" "budget_webhook" {
  project = var.project_id
  name    = "budget-alerts-webhook"
  topic   = google_pubsub_topic.budget_alerts.name

  push_config {
    push_endpoint = "https://api.ttndd.org/admin/cost/budget-webhook"

    oidc_token {
      service_account_email = "budget-alerts@${var.project_id}.iam.gserviceaccount.com"
    }
  }

  ack_deadline_seconds = 20

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }
}

# ─── Output ──────────────────────────────────────────────────

output "budget_id" {
  value       = google_billing_budget.ttndd_monthly.id
  description = "Budget resource ID"
}

output "pubsub_topic" {
  value       = google_pubsub_topic.budget_alerts.name
  description = "Pub/Sub topic for budget alerts"
}
