from django.contrib import admin
from .models import PageVisit, SecurityEvent


@admin.register(PageVisit)
class PageVisitAdmin(admin.ModelAdmin):
    list_display  = ['ip_address', 'visitor_type', 'path', 'device_type', 'browser', 'is_suspicious', 'created_at']
    list_filter   = ['visitor_type', 'device_type', 'is_suspicious', 'is_bot']
    search_fields = ['ip_address', 'path', 'user__email']
    ordering      = ['-created_at']
    readonly_fields = ['created_at']


@admin.register(SecurityEvent)
class SecurityEventAdmin(admin.ModelAdmin):
    list_display  = ['event_type', 'severity', 'ip_address', 'is_resolved', 'created_at']
    list_filter   = ['event_type', 'severity', 'is_resolved']
    search_fields = ['ip_address', 'description']
    ordering      = ['-created_at']

    actions = ['mark_resolved']

    @admin.action(description='Hal qilindi deb belgilash')
    def mark_resolved(self, request, queryset):
        from django.utils import timezone
        queryset.update(is_resolved=True, resolved_by=request.user, resolved_at=timezone.now())
