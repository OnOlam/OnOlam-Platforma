"""
OnOlam — Certificates Models
"""
from django.db import models
from django.conf import settings
import uuid


class Certificate(models.Model):
    """Sertifikat modeli"""
    cert_id    = models.UUIDField(default=uuid.uuid4, unique=True)
    user       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='certificates')
    course     = models.ForeignKey('courses.Course', on_delete=models.CASCADE, related_name='certificates')
    issued_at  = models.DateTimeField(auto_now_add=True)
    pdf_file   = models.FileField(upload_to='certificates/', blank=True, null=True)

    class Meta:
        verbose_name        = 'Sertifikat'
        verbose_name_plural = 'Sertifikatlar'
        unique_together = ['user', 'course']

    def __str__(self):
        return f'{self.user} — {self.course} sertifikati'

    @property
    def verify_url(self):
        return f'https://onolam.uz/verify/{self.cert_id}'
