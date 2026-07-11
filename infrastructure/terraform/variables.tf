variable "project_id" {
  description = "Google Cloud project that owns the public deployment."
  type        = string
}

variable "region" {
  description = "Regional GKE, Memorystore, and Artifact Registry location."
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Deployment environment used in resource names and labels."
  type        = string
  default     = "production"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,20}$", var.environment))
    error_message = "environment must be a lowercase, hyphenated identifier."
  }
}

variable "github_repository" {
  description = "GitHub repository allowed to deploy, in owner/repository form."
  type        = string
}

variable "namespace" {
  description = "Kubernetes namespace used by the Helm release."
  type        = string
  default     = "openagent"
}

variable "cluster_name" {
  description = "Optional GKE cluster name."
  type        = string
  default     = ""
}

variable "artifact_repository" {
  description = "Artifact Registry Docker repository name."
  type        = string
  default     = "openagent"
}

variable "attachments_bucket_name" {
  description = "Globally unique private GCS bucket name for attachments."
  type        = string
}

variable "redis_memory_size_gb" {
  description = "Memorystore capacity. Standard HA requires at least 5 GiB."
  type        = number
  default     = 5

  validation {
    condition     = var.redis_memory_size_gb >= 5
    error_message = "Production Standard HA Memorystore requires at least 5 GiB."
  }
}

variable "deletion_protection" {
  description = "Keep true for production. Set false only in disposable environments."
  type        = bool
  default     = true
}
