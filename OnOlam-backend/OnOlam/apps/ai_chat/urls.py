"""OnOlam — AI Chat URL patterns"""
from django.urls import path
from . import views

urlpatterns = [
    path('chat/',            views.chat_message,                    name='ai-chat'),
    path('sessions/',        views.ChatSessionListView.as_view(),   name='ai-sessions'),
    path('sessions/<int:pk>/messages/', views.session_messages,    name='ai-session-messages'),

    # ── ADMIN ──
    path('admin/kb/',                views.AdminKBListView.as_view(),   name='admin-kb-list'),
    path('admin/kb/create/',         views.admin_kb_create,             name='admin-kb-create'),
    path('admin/kb/<int:pk>/',       views.admin_kb_update,             name='admin-kb-update'),
    path('admin/unanswered/',        views.unanswered_questions,        name='admin-unanswered'),
]
