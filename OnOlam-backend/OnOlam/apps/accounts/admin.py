from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, BlockedIP, BlockedEmail, LoginAttempt


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display  = ['email', 'username', 'get_full_name', 'plan', 'is_pro', 'is_blocked', 'streak_count', 'created_at']
    list_filter   = ['plan', 'is_blocked', 'is_active', 'is_staff']
    search_fields = ['email', 'username', 'first_name', 'last_name']
    ordering      = ['-created_at']
    readonly_fields = ['created_at', 'updated_at', 'last_login_at', 'streak_count', 'max_streak']

    fieldsets = (
        ('Asosiy', {'fields': ('email', 'username', 'password')}),
        ('Shaxsiy', {'fields': ('first_name', 'last_name', 'bio', 'avatar', 'phone', 'location')}),
        ('Tarif', {'fields': ('plan', 'pro_expires_at')}),
        ('Streak', {'fields': ('streak_count', 'max_streak', 'last_activity')}),
        ('Holat', {'fields': ('is_active', 'is_staff', 'is_superuser', 'is_blocked', 'block_reason')}),
        ('Sana', {'fields': ('created_at', 'updated_at', 'last_login_at')}),
    )
    add_fieldsets = (
        (None, {'fields': ('email', 'username', 'first_name', 'password1', 'password2')}),
    )

    @admin.display(boolean=True, description='Pro?')
    def is_pro(self, obj):
        return obj.is_pro

    actions = ['give_pro', 'block_users', 'unblock_users']

    @admin.action(description='Pro berish (30 kun)')
    def give_pro(self, request, queryset):
        from django.utils import timezone
        queryset.update(plan='pro', pro_expires_at=timezone.now() + timezone.timedelta(days=30))
        self.message_user(request, f'{queryset.count()} ta foydalanuvchiga Pro berildi')

    @admin.action(description='Bloklash')
    def block_users(self, request, queryset):
        for user in queryset:
            user.block(reason='Admin tomonidan bloklandi')
        self.message_user(request, f'{queryset.count()} ta foydalanuvchi bloklandi')

    @admin.action(description='Blokdan chiqarish')
    def unblock_users(self, request, queryset):
        for user in queryset:
            user.unblock()
        self.message_user(request, f'{queryset.count()} ta foydalanuvchi blokdan chiqarildi')


@admin.register(BlockedIP)
class BlockedIPAdmin(admin.ModelAdmin):
    list_display  = ['ip_address', 'reason', 'created_at']
    search_fields = ['ip_address', 'reason']


@admin.register(BlockedEmail)
class BlockedEmailAdmin(admin.ModelAdmin):
    list_display  = ['email_or_domain', 'reason', 'created_at']
    search_fields = ['email_or_domain']


@admin.register(LoginAttempt)
class LoginAttemptAdmin(admin.ModelAdmin):
    list_display  = ['ip_address', 'email', 'success', 'created_at']
    list_filter   = ['success']
    search_fields = ['ip_address', 'email']
    ordering      = ['-created_at']
