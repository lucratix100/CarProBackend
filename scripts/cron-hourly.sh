#!/usr/bin/env bash
# Cron carPro — à planifier toutes les heures (ou quotidiennement).
# Exemple crontab :
#   5 * * * * /chemin/vers/carPro/server/scripts/cron-hourly.sh >> /var/log/carpro-cron.log 2>&1

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Sync statuts locations (En cours / Terminée) + emails alertes favoris
node ace rentals:sync-statuses
