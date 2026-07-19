locals {
  prefix = "openagent-${var.environment}"
  labels = {
    application = "openagent"
    environment = var.environment
    managed_by  = "terraform"
  }
  secret_ids = {
    database_url   = "${local.prefix}-database-url"
    secret_key     = "${local.prefix}-secret-key"
    encryption_key = "${local.prefix}-encryption-key"
    resend_api_key = "${local.prefix}-resend-api-key"
    redis_url      = "${local.prefix}-redis-url"
    invited_emails = "${local.prefix}-invited-emails"
  }
}

resource "google_project_service" "required" {
  for_each = toset([
    "artifactregistry.googleapis.com",
    "iamcredentials.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "sts.googleapis.com",
  ])

  service            = each.value
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "images" {
  location      = var.region
  repository_id = var.artifact_repository
  description   = "OpenAgent Hub beta container images"
  format        = "DOCKER"
  labels        = local.labels

  depends_on = [google_project_service.required]
}

resource "google_storage_bucket" "attachments" {
  name                        = var.attachments_bucket_name
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false
  labels                      = local.labels

  versioning { enabled = true }
}

resource "google_service_account" "runtime" {
  account_id   = "${local.prefix}-runtime"
  display_name = "OpenAgent Hub beta Cloud Run runtime"
}

resource "google_storage_bucket_iam_member" "runtime_attachments" {
  bucket = google_storage_bucket.attachments.name
  role   = "roles/storage.objectUser"
  member = "serviceAccount:${google_service_account.runtime.email}"
}

resource "google_secret_manager_secret" "runtime" {
  for_each  = local.secret_ids
  secret_id = each.value
  labels    = local.labels

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_iam_member" "runtime" {
  for_each  = google_secret_manager_secret.runtime
  secret_id = each.value.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime.email}"
}

resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "${local.prefix}-github"
  display_name              = "OpenAgent beta GitHub"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github"
  display_name                       = "GitHub Actions"
  attribute_condition                = "assertion.repository == '${var.github_repository}'"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
  }

  oidc { issuer_uri = "https://token.actions.githubusercontent.com" }
}

resource "google_service_account" "github_deployer" {
  account_id   = "${local.prefix}-deployer"
  display_name = "OpenAgent Hub beta GitHub Actions deployer"
}

resource "google_service_account_iam_member" "github_workload_identity" {
  service_account_id = google_service_account.github_deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repository}"
}

resource "google_project_iam_member" "github_deployer" {
  for_each = toset([
    "roles/artifactregistry.writer",
    "roles/run.admin",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.github_deployer.email}"
}

# The public service may start an on-demand knowledge indexing Job, but it
# cannot deploy or modify Cloud Run resources.
resource "google_project_iam_member" "runtime_job_invoker" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.runtime.email}"
}

resource "google_service_account_iam_member" "github_runtime_user" {
  service_account_id = google_service_account.runtime.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.github_deployer.email}"
}
