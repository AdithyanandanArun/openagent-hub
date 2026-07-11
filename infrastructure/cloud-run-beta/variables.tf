variable "project_id" {
  description = "Google Cloud project used for the beta. Billing must be enabled for Cloud Run."
  type        = string
}

variable "region" {
  description = "Cloud Run, Artifact Registry, and GCS location. Use a US free-tier GCS region for the lowest cost."
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Name used in beta resources."
  type        = string
  default     = "beta"
}

variable "github_repository" {
  description = "GitHub repository authorized to deploy, in owner/repository form."
  type        = string
}

variable "attachments_bucket_name" {
  description = "Globally unique private GCS bucket for beta attachments."
  type        = string
}

variable "artifact_repository" {
  description = "Artifact Registry Docker repository name."
  type        = string
  default     = "openagent-beta"
}
