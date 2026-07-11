"""One-shot entry point for the Kubernetes provider-health CronJob."""
import asyncio

from app.services.health_probe import _probe_round


if __name__ == "__main__":
    asyncio.run(_probe_round())
