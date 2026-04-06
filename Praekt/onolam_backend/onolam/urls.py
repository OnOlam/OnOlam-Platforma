"""
OnOlam — Asosiy URL konfiguratsiyasi
Barcha API endpointlar shu yerdan boshlanadi
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView

# API versiya prefiksi
API_V1 = 'api/v1/'

urlpatterns = [
    # ── Django Admin ──
    path('django-admin/', admin.site.urls),

    # ── Auth (JWT) ──
    path(f'{API_V1}auth/', include('onolam.apps.accounts.urls')),
    path(f'{API_V1}auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # ── Asosiy ──
    path(f'{API_V1}courses/',      include('onolam.apps.courses.urls')),
    path(f'{API_V1}payments/',     include('onolam.apps.payments.urls')),
    path(f'{API_V1}certificates/', include('onolam.apps.certificates.urls')),
    path(f'{API_V1}ai/',           include('onolam.apps.ai_chat.urls')),
    path(f'{API_V1}analytics/',    include('onolam.apps.analytics.urls')),
    path(f'{API_V1}community/',    include('onolam.apps.community.urls')),
]

# Development: media fayllar va debug toolbar
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL,  document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    try:
        pass  # debug_toolbar o'chirildi
    except ImportError:
        pass

# ── Admin panel sozlamalari ──
admin.site.site_header  = 'OnOlam Admin'
admin.site.site_title   = 'OnOlam'
admin.site.index_title  = 'Platforma boshqaruvi'
