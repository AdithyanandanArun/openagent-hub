output "artifact_registry_repository" {
  value       = google_artifact_registry_repository.images.name
  description = "Full Artifact Registry repository resource name."
}

output "cluster_name" {
  value       = google_container_cluster.main.name
  description = "GKE cluster name for get-credentials and CI."
}

output "attachments_bucket" {
  value       = google_storage_bucket.attachments.name
  description = "Private bucket configured as GCS_BUCKET."
}

output "ingress_static_ip_name" {
  value       = google_compute_global_address.ingress.name
  description = "Pass this reserved global address name to Helm ingress.staticIpName."
}

output "ingress_ip_address" {
  value       = google_compute_global_address.ingress.address
  description = "Create the DNS A record for the public hostname with this address."
}

output "redis_host" {
  value       = google_redis_instance.main.host
  description = "Private Redis host. Configure Helm with redis://<host>:6379/0."
}

output "application_service_account" {
  value       = google_service_account.application.email
  description = "GSA used by the GKE application service account."
}

output "github_actions_service_account" {
  value       = google_service_account.github_deployer.email
  description = "GSA GitHub Actions impersonates through workload identity federation."
}

output "github_workload_identity_provider" {
  value       = google_iam_workload_identity_pool_provider.github.name
  description = "Set this as GitHub variable GCP_WORKLOAD_IDENTITY_PROVIDER."
}

output "secret_resource_names" {
  value = {
    for key, secret in google_secret_manager_secret.runtime : key => "${secret.id}/versions/latest"
  }
  description = "Secret Manager resource versions to pass to the Helm chart; no secret values are output."
}
