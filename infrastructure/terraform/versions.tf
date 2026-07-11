terraform {
  required_version = ">= 1.7.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }

  # Configure a versioned GCS backend for state before the first shared apply.
  # Example:
  # backend "gcs" { bucket = "my-platform-tf-state"; prefix = "openagent" }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
