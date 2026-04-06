"""OnOlam — Analytics URL patterns"""
from django.urls import path
from . import views

urlpatterns = [
    # ── ADMIN ──
    path('dashboard/',       views.analytics_dashboard,             name='analytics-dashboard'),
    path('visitors/',        views.VisitorListView.as_view(),       name='analytics-visitors'),
    path('security/',        views.SecurityEventListView.as_view(), name='analytics-security'),
    path('security/<int:pk>/resolve/', views.resolve_security_event, name='security-resolve'),
    path('pages/',           views.page_stats,                      name='analytics-pages'),
    path('realtime/',        views.realtime_stats,                  name='analytics-realtime'),
]
