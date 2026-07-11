output "artifact_repository" {
  value       = google_artifact_registry_repository.images.repository_id
  description = "Set GitHub variable BETA_ARTIFACT_REPOSITORY."
}

output "attachments_bucket" {
  value       = google_storage_bucket.attachments.name
  description = "Set GitHub variable BETA_GCS_BUCKET."
}

output "runtime_service_account" {
  value       = google_service_account.runtime.email
  description = "Set GitHub variable BETA_RUNTIME_SERVICE_ACCOUNT."
}

output "github_deployer_service_account" {
  value       = google_service_account.github_deployer.email
  description = "Set GitHub variable BETA_DEPLOYER_SERVICE_ACCOUNT."
}

output "github_workload_identity_provider" {
  value       = google_iam_workload_identity_pool_provider.github.name
  description = "Set GitHub variable BETA_WORKLOAD_IDENTITY_PROVIDER."
}

output "secret_ids" {
  value       = { for key, secret in google_secret_manager_secret.runtime : key => secret.secret_id }
  description = "Secret IDs only. Terraform never creates or outputs secret values."
}
