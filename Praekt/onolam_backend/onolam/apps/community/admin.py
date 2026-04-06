from django.contrib import admin
from .models import Channel, Post, Comment


@admin.register(Channel)
class ChannelAdmin(admin.ModelAdmin):
    list_display  = ['name', 'slug', 'order', 'is_active']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display  = ['user', 'channel', 'post_type', 'is_pinned', 'is_active', 'created_at']
    list_filter   = ['channel', 'post_type', 'is_active']
    search_fields = ['user__username', 'content']


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display  = ['user', 'post', 'is_active', 'created_at']
    list_filter   = ['is_active']
