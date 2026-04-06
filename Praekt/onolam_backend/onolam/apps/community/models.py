"""OnOlam — Community Models"""
from django.db import models
from django.utils import timezone


class Channel(models.Model):
    """Kanal — umumiy, loyihalar, savol-javob"""
    name        = models.CharField(max_length=50)
    slug        = models.SlugField(unique=True)
    description = models.CharField(max_length=200)
    icon        = models.CharField(max_length=10, default='#')
    order       = models.IntegerField(default=0)
    is_active   = models.BooleanField(default=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.name


class Post(models.Model):
    """Post — foydalanuvchi yozuvi"""
    class Type(models.TextChoices):
        TEXT    = 'text',    'Matn'
        PROJECT = 'project', 'Loyiha'
        QUESTION = 'question', 'Savol'

    user       = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='posts')
    channel    = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name='posts')
    content    = models.TextField(max_length=2000)
    post_type  = models.CharField(max_length=20, choices=Type.choices, default=Type.TEXT)
    image      = models.ImageField(upload_to='community/images/%Y/%m/', null=True, blank=True)
    video      = models.FileField(upload_to='community/videos/%Y/%m/', null=True, blank=True)
    file       = models.FileField(upload_to='community/files/%Y/%m/', null=True, blank=True)
    file_name  = models.CharField(max_length=255, blank=True)
    link       = models.URLField(max_length=500, blank=True)
    likes      = models.ManyToManyField('accounts.User', related_name='liked_posts', blank=True)
    is_pinned  = models.BooleanField(default=False)
    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_pinned', '-created_at']

    def __str__(self):
        return f"{self.user.username}: {self.content[:50]}"

    @property
    def like_count(self):
        return self.likes.count()

    @property
    def comment_count(self):
        return self.comments.filter(is_active=True).count()


class Comment(models.Model):
    """Izoh"""
    post       = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    user       = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='comments')
    content    = models.TextField(max_length=500)
    likes      = models.ManyToManyField('accounts.User', related_name='liked_comments', blank=True)
    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.user.username}: {self.content[:30]}"

class ChatMessage(models.Model):
    """Kanal chat xabari"""
    channel    = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name='chat_messages')
    user       = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='chat_messages')
    content    = models.TextField(max_length=500)
    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username}: {self.content[:30]}"


class DirectMessage(models.Model):
    """Shaxsiy xabar"""
    sender     = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='sent_messages')
    receiver   = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='received_messages')
    content    = models.TextField(max_length=1000)
    is_read    = models.BooleanField(default=False)
    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender.username} -> {self.receiver.username}: {self.content[:30]}"

class ChannelView(models.Model):
    """Foydalanuvchi kanalga oxirgi kirish vaqti"""
    user       = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='channel_views')
    channel    = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name='views')
    last_seen  = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ['user', 'channel']

    def __str__(self):
        return f"{self.user.username} - {self.channel.name}"
