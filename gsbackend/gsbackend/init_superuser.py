docker compose exec backend python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
User.objects.create_superuser(
    email='admin@gs.com',
    password='Admin123!'
)
"


docker compose exec backend python manage.py shell -c "
from django.apps import apps
from django.db import connection

with connection.cursor() as cursor:
    cursor.execute('SET FOREIGN_KEY_CHECKS = 0;')

    for model in apps.get_models():
        model.objects.all().delete()

    cursor.execute('SET FOREIGN_KEY_CHECKS = 1;')

print('✅ Toutes les tables ont été vidées')
"

Vider UNE table précise
docker compose exec backend python manage.py shell -c "
from stages.models import Demande
Demande.objects.all().delete()
"

Réinitialiser les IDs AUTO_INCREMENT (MySQL)
docker compose exec backend python manage.py shell -c "
from django.db import connection
with connection.cursor() as c:
    c.execute('ALTER TABLE stages_demande AUTO_INCREMENT = 1;')
print('OK')
"

Changer un mot de passe
docker compose exec backend python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
u = User.objects.get(email='admin@gs.com')
u.set_password('NouveauPass123!')
u.save()

Voir les migrations appliquées
docker compose exec backend python manage.py showmigrations

Appliquer migrations propres
docker compose exec backend python manage.py migrate --noinput