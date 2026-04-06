from django.contrib import admin
from .models import Payment, Subscription, Coupon


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display  = ['payment_id', 'user', 'amount', 'plan', 'method', 'status', 'created_at']
    list_filter   = ['status', 'method', 'plan']
    search_fields = ['user__email', 'payment_id', 'external_id']
    ordering      = ['-created_at']
    readonly_fields = ['payment_id', 'created_at', 'completed_at']


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display  = ['code', 'discount_percent', 'used_count', 'max_uses', 'is_active', 'valid_until']
    list_filter   = ['is_active']
    search_fields = ['code']


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display  = ['user', 'plan', 'is_active', 'expires_at']
    list_filter   = ['is_active', 'plan']
    search_fields = ['user__email']
