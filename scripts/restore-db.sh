#!/bin/sh
# ============================================================================
# Restauration d'un backup de la base de données.
#
# Usage :
#   ./scripts/restore-db.sh backups/gsdb_20260706_020000.sql.gz
#
# ATTENTION : écrase intégralement la base courante avec le contenu du dump.
# Les variables DB_NAME / DB_PASSWORD sont lues depuis le fichier .env.
# ============================================================================
set -eu

if [ $# -ne 1 ] || [ ! -f "$1" ]; then
    echo "Usage : $0 <chemin/vers/backup.sql.gz>" >&2
    echo "Backups disponibles :" >&2
    ls -1h backups/*.sql.gz 2>/dev/null >&2 || echo "  (aucun)" >&2
    exit 1
fi

BACKUP_FILE="$1"

# Charger DB_NAME / DB_PASSWORD depuis .env
if [ -f .env ]; then
    # shellcheck disable=SC1091
    set -a; . ./.env; set +a
fi
: "${DB_NAME:?DB_NAME introuvable (definir dans .env)}"
: "${DB_PASSWORD:?DB_PASSWORD introuvable (definir dans .env)}"

echo "Base cible      : $DB_NAME"
echo "Fichier restauré : $BACKUP_FILE"
printf "Confirmer la restauration ? Cela ECRASE la base actuelle. [oui/N] "
read -r answer
[ "$answer" = "oui" ] || { echo "Abandon."; exit 1; }

# Sauvegarde de sécurité avant écrasement
ts=$(date +%Y%m%d_%H%M%S)
safety="backups/avant_restauration_${ts}.sql.gz"
echo "Sauvegarde de sécurité -> $safety"
docker compose exec -T db mariadb-dump -u root -p"$DB_PASSWORD" \
    --single-transaction --routines --triggers --events "$DB_NAME" | gzip > "$safety"

echo "Restauration en cours..."
gunzip -c "$BACKUP_FILE" | docker compose exec -T db mariadb -u root -p"$DB_PASSWORD" "$DB_NAME"

echo "Restauration terminée. Redémarrage du backend conseillé :"
echo "  docker compose restart backend"
