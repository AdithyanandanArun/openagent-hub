locals {
  name_prefix  = "openagent-${var.environment}"
  cluster_name = var.cluster_name != "" ? var.cluster_name : "${local.name_prefix}-gke"
  labels = {
    application = "openagent"
    environment = var.environment
    managed_by  = "terraform"
  }
  secret_ids = {
    database_url   = "${local.name_prefix}-database-url"
    secret_key     = "${local.name_prefix}-secret-key"
    encryption_key = "${local.name_prefix}-encryption-key"
    resend_api_key = "${local.name_prefix}-resend-api-key"
  }
}

resource "google_project_service" "required" {
  for_each = toset([
    "artifactregistry.googleapis.com",
    "compute.googleapis.com",
    "container.googleapis.com",
    "iamcredentials.googleapis.com",
    "redis.googleapis.com",
    "secretmanager.googleapis.com",
    "sts.googleapis.com",
  ])

  service            = each.value
  disable_on_destroy = false
}

resource "google_compute_network" "main" {
  name                    = "${local.name_prefix}-vpc"
  auto_create_subnetworks = false
  project                 = var.project_id
}

resource "google_compute_subnetwork" "gke" {
  name          = "${local.name_prefix}-gke"
  ip_cidr_range = "10.32.0.0/20"
  region        = var.region
  network       = google_compute_network.main.id

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.48.0.0/14"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.52.0.0/20"
  }
}

resource "google_compute_router" "nat" {
  name    = "${local.name_prefix}-router"
  region  = var.region
  network = google_compute_network.main.id
}

resource "google_compute_router_nat" "main" {
  name                               = "${local.name_prefix}-nat"
  router                             = google_compute_router.nat.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}

resource "google_artifact_registry_repository" "images" {
  location      = var.region
  repository_id = var.artifact_repository
  description   = "OpenAgent Hub container images"
  format        = "DOCKER"
  labels        = local.labels

  depends_on = [google_project_service.required]
}

resource "google_compute_global_address" "ingress" {
  name         = "${local.name_prefix}-ingress"
  address_type = "EXTERNAL"
  ip_version   = "IPV4"
  description  = "Reserved public address for the OpenAgent Hub GKE ingress"
}

resource "google_storage_bucket" "attachments" {
  name                        = var.attachments_bucket_name
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false
  labels                      = local.labels

  versioning {
    enabled = true
  }

  lifecycle_rule {
    action { type = "Delete" }
    condition {
      age                = 30
      with_state         = "ARCHIVED"
      num_newer_versions = 3
    }
  }
}

resource "google_redis_instance" "main" {
  name               = "${local.name_prefix}-redis"
  tier               = "STANDARD_HA"
  memory_size_gb     = var.redis_memory_size_gb
  region             = var.region
  redis_version      = "REDIS_7_2"
  authorized_network = google_compute_network.main.id
  display_name       = "OpenAgent Hub ${var.environment}"
  labels             = local.labels

  depends_on = [google_project_service.required]
}

resource "google_container_cluster" "main" {
  name                = local.cluster_name
  location            = var.region
  enable_autopilot    = true
  network             = google_compute_network.main.id
  subnetwork          = google_compute_subnetwork.gke.id
  deletion_protection = var.deletion_protection
  resource_labels     = local.labels

  release_channel { channel = "REGULAR" }

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  secret_manager_config { enabled = true }

  depends_on = [google_project_service.required, google_compute_router_nat.main]
}

resource "google_service_account" "application" {
  account_id   = "${local.name_prefix}-app"
  display_name = "OpenAgent Hub application workload"
}

resource "google_storage_bucket_iam_member" "application_attachments" {
  bucket = google_storage_bucket.attachments.name
  role   = "roles/storage.objectUser"
  member = "serviceAccount:${google_service_account.application.email}"
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

resource "google_secret_manager_secret_iam_member" "application" {
  for_each  = google_secret_manager_secret.runtime
  secret_id = each.value.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.application.email}"
}

resource "google_service_account_iam_member" "application_workload_identity" {
  service_account_id = google_service_account.application.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[${var.namespace}/openagent]"
}

resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "${local.name_prefix}-github"
  display_name              = "OpenAgent Hub GitHub Actions"
  description               = "Federates the selected GitHub repository to deploy OpenAgent Hub"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github"
  display_name                       = "GitHub Actions"
  attribute_condition                = "assertion.repository == '${var.github_repository}'"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }

  oidc { issuer_uri = "https://token.actions.githubusercontent.com" }
}

resource "google_service_account" "github_deployer" {
  account_id   = "${local.name_prefix}-github"
  display_name = "OpenAgent Hub GitHub Actions deployer"
}

resource "google_service_account_iam_member" "github_workload_identity" {
  service_account_id = google_service_account.github_deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repository}"
}

resource "google_project_iam_member" "github_deployer" {
  for_each = toset([
    "roles/artifactregistry.writer",
    "roles/container.admin",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.github_deployer.email}"
}
