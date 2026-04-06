from django.contrib import admin
from .models import Certificate


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display  = ['cert_id', 'user', 'course', 'issued_at']
    search_fields = ['user__email', 'course__title', 'cert_id']
    ordering      = ['-issued_at']
    readonly_fields = ['cert_id', 'issued_at']
