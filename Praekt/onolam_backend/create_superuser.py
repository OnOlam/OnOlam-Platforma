import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'onolam.settings.production')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser(
        username='admin',
        email='admin@onolam.uz',
        password='Admin123!@#'
    )
    print('Superuser created!')
else:
    print('Superuser already exists.')
