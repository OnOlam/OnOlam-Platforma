"""OnOlam — Auth URL patterns"""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    # ── AUTH ──
    path('register/',        views.register_view,       name='auth-register'),
    path('login/',           views.login_view,           name='auth-login'),
    path('logout/',          views.logout_view,          name='auth-logout'),
    path('profile/',         views.ProfileView.as_view(), name='auth-profile'),
    path('change-password/', views.change_password_view, name='auth-change-password'),

    # ── ADMIN ──
    path('admin/users/',                   views.AdminUserListView.as_view(), name='admin-users'),
    path('admin/users/<int:user_id>/block/',    views.admin_block_user, name='admin-block-user'),
    path('admin/users/<int:user_id>/give-pro/', views.admin_give_pro,   name='admin-give-pro'),
]
