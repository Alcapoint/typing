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

if [ -n "$DJANGO_SUPERUSER_EMAIL" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ] && [ -n "$DJANGO_SUPERUSER_USERNAME" ]; then
python manage.py shell <<'EOF'
import os
from django.contrib.auth import get_user_model

User = get_user_model()

email = os.environ["DJANGO_SUPERUSER_EMAIL"]
password = os.environ["DJANGO_SUPERUSER_PASSWORD"]
username = os.environ["DJANGO_SUPERUSER_USERNAME"]
first_name = os.environ.get("DJANGO_SUPERUSER_FIRST_NAME", "")
last_name = os.environ.get("DJANGO_SUPERUSER_LAST_NAME", "")

user, created = User.objects.get_or_create(
    email=email,
    defaults={
        "username": username,
        "first_name": first_name,
        "last_name": last_name,
        "is_staff": True,
        "is_superuser": True,
    },
)

changed = False
if user.username != username:
    user.username = username
    changed = True
if first_name and user.first_name != first_name:
    user.first_name = first_name
    changed = True
if last_name and user.last_name != last_name:
    user.last_name = last_name
    changed = True
if not user.is_staff:
    user.is_staff = True
    changed = True
if not user.is_superuser:
    user.is_superuser = True
    changed = True

user.set_password(password)
changed = True

if changed:
    user.save()

print("Superuser is ready:", email)
EOF
fi

exec "$@"
