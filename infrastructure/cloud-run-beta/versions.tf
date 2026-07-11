terraform {
  required_version = ">= 1.7.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }

  # Configure a remote, versioned GCS backend before sharing Terraform state.
}

provider "google" {
  project = var.project_id
  region  = var.region
}
