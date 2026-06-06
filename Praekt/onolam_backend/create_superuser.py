import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'onolam.settings.production')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

# Parolni environment variable'dan olish
admin_password = os.environ.get('ADMIN_PASSWORD', 'default123')

try:
    admin = User.objects.get(username='admin')
    admin.set_password(admin_password)
    admin.is_superuser = True
    admin.is_staff = True
    admin.save()
    print('Admin parol yangilandi!')
except User.DoesNotExist:
    User.objects.create_superuser(
        username='admin',
        email='admin@onolam.uz',
        password=admin_password
    )
    print('Admin yaratildi!')
