"""OnOlam — Payments URL patterns"""
from django.urls import path
from . import views

urlpatterns = [
    # ── TO'LOV BOSHLASH ──
    path('create/',         views.create_payment,     name='payment-create'),
    path('verify/',         views.verify_coupon,      name='coupon-verify'),

    # ── WEBHOOK (PayMe/Click to'lov tizimlaridan) ──
    path('payme/webhook/',  views.payme_webhook,      name='payme-webhook'),
    path('click/webhook/',  views.click_webhook,      name='click-webhook'),

    # ── FOYDALANUVCHI ──
    path('history/',        views.PaymentHistoryView.as_view(), name='payment-history'),
    path('subscription/',   views.subscription_status,          name='subscription-status'),

    # ── ADMIN ──
    path('admin/list/',     views.AdminPaymentListView.as_view(), name='admin-payments'),
    path('admin/<uuid:payment_id>/refund/', views.admin_refund, name='admin-refund'),
    path('admin/coupons/',  views.AdminCouponListView.as_view(), name='admin-coupons'),
    path('admin/coupons/create/', views.admin_create_coupon,    name='admin-coupon-create'),
]
