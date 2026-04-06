"""
OnOlam — AI Chat Models
Bilimlar bazasi, suhbat tarixi
"""
from django.db import models
from django.conf import settings


class KnowledgeBase(models.Model):
    """Admin tomonidan to'ldirilgan bilimlar bazasi"""

    class Category(models.TextChoices):
        COURSE   = 'course',   'Kurs ma\'lumoti'
        FAQ      = 'faq',      'FAQ'
        PAYMENT  = 'payment',  'To\'lovlar'
        PLATFORM = 'platform', 'Platforma'
        OTHER    = 'other',    'Boshqa'

    title       = models.CharField(max_length=200, verbose_name='Mavzu')
    category    = models.CharField(max_length=15, choices=Category.choices, default=Category.OTHER)
    content     = models.TextField(verbose_name='Kontent (AI o\'qiydi)')
    keywords    = models.CharField(max_length=500, blank=True, verbose_name='Kalit so\'zlar')
    priority    = models.PositiveIntegerField(default=5, verbose_name='Muhimlik (1-10)')
    is_active   = models.BooleanField(default=True)
    related_course = models.ForeignKey(
        'courses.Course', on_delete=models.SET_NULL,
        null=True, blank=True
    )
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = 'Bilim elementi'
        verbose_name_plural = 'Bilimlar bazasi'
        ordering = ['-priority', '-updated_at']

    def __str__(self):
        return self.title


class ChatSession(models.Model):
    """Foydalanuvchi chat sessiyasi"""
    user       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chat_sessions')
    lesson     = models.ForeignKey('courses.Lesson', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f'{self.user} — {self.created_at.date()}'


class ChatMessage(models.Model):
    """Chat xabarlari"""

    class Role(models.TextChoices):
        USER = 'user', 'Foydalanuvchi'
        AI   = 'ai',   'AI'

    session   = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    role      = models.CharField(max_length=5, choices=Role.choices)
    content   = models.TextField(verbose_name='Xabar')
    kb_used   = models.ForeignKey(
        KnowledgeBase, on_delete=models.SET_NULL,
        null=True, blank=True,
        verbose_name='Ishlatilgan bilim elementi'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'{self.role}: {self.content[:50]}'
