#!/bin/sh
set -e

# Volume Dokploy : le montage remplace le dossier de l’image.
# Recréer l’arborescence à chaque démarrage (idempotent).
mkdir -p \
  /app/storage/uploads/vehicles \
  /app/storage/uploads/logos \
  /app/storage/uploads/banners \
  /app/storage/uploads/licenses \
  /app/tmp

exec "$@"
