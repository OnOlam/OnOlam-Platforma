from django.contrib import admin
from .models import KnowledgeBase, ChatSession, ChatMessage


@admin.register(KnowledgeBase)
class KnowledgeBaseAdmin(admin.ModelAdmin):
    list_display  = ['title', 'category', 'priority', 'is_active', 'updated_at']
    list_filter   = ['category', 'is_active']
    search_fields = ['title', 'content', 'keywords']
    ordering      = ['-priority', '-updated_at']


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display  = ['user', 'lesson', 'created_at']
    search_fields = ['user__email']


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display  = ['session', 'role', 'content_short', 'created_at']
    list_filter   = ['role']

    @admin.display(description='Xabar')
    def content_short(self, obj):
        return obj.content[:80]
