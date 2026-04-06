"""OnOlam — Certificates URL patterns"""
from django.urls import path
from . import views

urlpatterns = [
    path('',                    views.UserCertificateListView.as_view(), name='cert-list'),
    path('<uuid:cert_id>/',     views.certificate_detail,                name='cert-detail'),
    path('<uuid:cert_id>/pdf/', views.download_certificate_pdf,          name='cert-pdf'),
    path('verify/<uuid:cert_id>/', views.verify_certificate,             name='cert-verify'),
]
