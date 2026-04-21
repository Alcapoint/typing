#!/bin/sh

set -e

cd /app/backend

echo "Waiting for database..."
python -c "
import os
import socket
import time

host = os.getenv('DB_HOST', 'db')
port = int(os.getenv('DB_PORT', '5432'))

for _ in range(60):
    try:
        with socket.create_connection((host, port), timeout=2):
            break
    except OSError:
        time.sleep(1)
else:
    raise SystemExit('Database is unavailable')
"

python manage.py migrate --noinput
python manage.py collectstatic --noinput --clear

exec "$@"
