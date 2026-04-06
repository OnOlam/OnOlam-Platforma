"""
OnOlam — Accounts Models
Foydalanuvchi, profil, streak, bloklash
"""
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class UserManager(BaseUserManager):
    """Custom user manager — email asosida"""

    def create_user(self, email, username, password=None, **extra_fields):
        if not email:
            raise ValueError('Email kiritilishi shart')
        if not username:
            raise ValueError('Username kiritilishi shart')
        email = self.normalize_email(email)
        user  = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username, password=None, **extra_fields):
        extra_fields.setdefault('is_staff',     True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active',    True)
        return self.create_user(email, username, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    OnOlam asosiy foydalanuvchi modeli
    Django standart User ni to'liq almashtiradi
    """

    # ── ASOSIY ──
    email      = models.EmailField(unique=True, verbose_name='Email')
    username   = models.CharField(max_length=50, unique=True, verbose_name='Username')
    first_name = models.CharField(max_length=50, verbose_name='Ism')
    last_name  = models.CharField(max_length=50, blank=True, verbose_name='Familiya')
    bio        = models.TextField(blank=True, verbose_name='Bio')
    avatar     = models.ImageField(
        upload_to='avatars/%Y/%m/',
        blank=True, null=True,
        verbose_name='Avatar'
    )

    # ── TARIF ──
    class PlanType(models.TextChoices):
        FREE = 'free', 'Free'
        PRO  = 'pro',  'Pro'

    plan = models.CharField(
        max_length=10,
        choices=PlanType.choices,
        default=PlanType.FREE,
        verbose_name='Tarif'
    )
    pro_expires_at = models.DateTimeField(
        null=True, blank=True,
        verbose_name='Pro tarif tugash sanasi'
    )

    # ── HOLAT ──
    is_active    = models.BooleanField(default=True,  verbose_name='Faol')
    is_staff     = models.BooleanField(default=False, verbose_name='Xodim')
    is_blocked   = models.BooleanField(default=False, verbose_name='Bloklangan')
    block_reason = models.TextField(blank=True, verbose_name='Bloklash sababi')
    blocked_at   = models.DateTimeField(null=True, blank=True)

    # ── STREAK ──
    streak_count    = models.PositiveIntegerField(default=0, verbose_name='Streak')
    last_activity   = models.DateTimeField(null=True, blank=True, verbose_name='Oxirgi faollik')
    last_logout     = models.DateTimeField(null=True, blank=True, verbose_name='Oxirgi chiqish')
    max_streak      = models.PositiveIntegerField(default=0, verbose_name='Eng uzun streak')

    # ── KONTAKT ──
    phone      = models.CharField(max_length=20, blank=True, verbose_name='Telefon')
    location   = models.CharField(max_length=100, blank=True, verbose_name='Joylashuv')
    website    = models.URLField(blank=True, verbose_name='Vebsayt')

    # ── SANA ──
    created_at   = models.DateTimeField(auto_now_add=True, verbose_name='Ro\'yxat sanasi')
    updated_at   = models.DateTimeField(auto_now=True)
    last_login_at = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['username', 'first_name']

    class Meta:
        verbose_name        = 'Foydalanuvchi'
        verbose_name_plural = 'Foydalanuvchilar'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.get_full_name()} (@{self.username})'

    def get_full_name(self):
        return f'{self.first_name} {self.last_name}'.strip()

    @property
    def is_pro(self):
        """Foydalanuvchi Pro tarifda ekanligini tekshiradi"""
        if self.plan == self.PlanType.PRO:
            if self.pro_expires_at is None:
                return True
            return self.pro_expires_at > timezone.now()
        return False

    def update_streak(self):
        """Kunlik streak yangilash"""
        from django.utils import timezone as tz
        today     = tz.now().date()
        last_date = self.last_activity.date() if self.last_activity else None

        if last_date == today:
            # Bugun allaqachon hisoblangan — faqat vaqtni yangilaymiz
            self.last_activity = tz.now()
            self.save(update_fields=['last_activity'])
            return

        if last_date and (today - last_date).days == 1:
            self.streak_count += 1  # Ketma-ket kun
        else:
            self.streak_count = 1   # Uzilish — qayta boshlash

        self.last_activity = tz.now()
        if self.streak_count > self.max_streak:
            self.max_streak = self.streak_count
        self.save(update_fields=['streak_count', 'last_activity', 'max_streak'])

    def block(self, reason=''):
        """Foydalanuvchini bloklash"""
        self.is_blocked   = True
        self.is_active    = False
        self.block_reason = reason
        self.blocked_at   = timezone.now()
        self.save(update_fields=['is_blocked', 'is_active', 'block_reason', 'blocked_at'])

    def unblock(self):
        """Foydalanuvchini blokdan chiqarish"""
        self.is_blocked   = False
        self.is_active    = True
        self.block_reason = ''
        self.save(update_fields=['is_blocked', 'is_active', 'block_reason'])


class BlockedIP(models.Model):
    """Bloklangan IP manzillar"""
    ip_address = models.GenericIPAddressField(unique=True, verbose_name='IP manzil')
    reason     = models.TextField(blank=True, verbose_name='Sabab')
    blocked_by = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, related_name='blocked_ips'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = 'Bloklangan IP'
        verbose_name_plural = 'Bloklangan IP lar'

    def __str__(self):
        return f'{self.ip_address} — {self.reason[:50]}'


class BlockedEmail(models.Model):
    """Bloklangan emaillar va domenlar"""
    email_or_domain = models.CharField(
        max_length=255, unique=True,
        verbose_name='Email yoki domen (*@domen.com)'
    )
    reason     = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = 'Bloklangan email'
        verbose_name_plural = 'Bloklangan emaillar'

    def __str__(self):
        return self.email_or_domain


class LoginAttempt(models.Model):
    """Login urinishlari — brute force himoya"""
    ip_address = models.GenericIPAddressField(verbose_name='IP')
    email      = models.EmailField(blank=True, verbose_name='Email')
    success    = models.BooleanField(default=False, verbose_name='Muvaffaqiyatli')
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = 'Login urinishi'
        verbose_name_plural = 'Login urinishlari'
        ordering = ['-created_at']

    def __str__(self):
        status = '✓' if self.success else '✗'
        return f'{status} {self.ip_address} — {self.email}'
