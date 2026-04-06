"""
OnOlam — Payments Models
To'lovlar, obunalar, qaytarishlar
"""
from django.db import models
from django.conf import settings
import uuid


class Payment(models.Model):
    """To'lov modeli — har bir to'lov tranzaksiyasi"""

    class Status(models.TextChoices):
        PENDING   = 'pending',   'Kutilmoqda'
        SUCCESS   = 'success',   'Muvaffaqiyatli'
        FAILED    = 'failed',    'Rad etildi'
        CANCELLED = 'cancelled', 'Bekor qilindi'
        REFUNDED  = 'refunded',  'Qaytarildi'

    class PaymentMethod(models.TextChoices):
        PAYME   = 'payme',   'PayMe'
        CLICK   = 'click',   'Click'
        UZCARD  = 'uzcard',  'Uzcard'
        HUMO    = 'humo',    'Humo'
        VISA    = 'visa',    'Visa'
        STRIPE  = 'stripe',  'Stripe'

    class PlanType(models.TextChoices):
        PRO_MONTHLY = 'pro_monthly', 'Pro (oylik)'
        PRO_YEARLY  = 'pro_yearly',  'Pro (yillik)'
        TEAM        = 'team',        'Jamoa'

    # ── IDENTIFIKATOR ──
    payment_id = models.UUIDField(
        default=uuid.uuid4, unique=True,
        verbose_name='To\'lov ID'
    )
    external_id = models.CharField(
        max_length=200, blank=True,
        verbose_name='Tashqi tizim ID (PayMe/Click)'
    )

    # ── FOYDALANUVCHI ──
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, related_name='payments'
    )

    # ── SUMMA ──
    amount   = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Summa ($)')
    currency = models.CharField(max_length=5, default='USD')

    # ── HOLAT ──
    status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name='Holat'
    )

    # ── USUL ──
    method   = models.CharField(max_length=15, choices=PaymentMethod.choices, verbose_name='Usul')
    plan     = models.CharField(max_length=15, choices=PlanType.choices, verbose_name='Tarif')

    # ── TO'LOV TAFSILOTI ──
    card_last4   = models.CharField(max_length=4, blank=True, verbose_name='Karta (oxirgi 4)')
    card_brand   = models.CharField(max_length=20, blank=True)
    failure_code = models.CharField(max_length=100, blank=True, verbose_name='Xato kodi')
    failure_msg  = models.TextField(blank=True, verbose_name='Xato xabari')

    # ── REFUND ──
    refunded_at     = models.DateTimeField(null=True, blank=True)
    refund_reason   = models.TextField(blank=True)
    refunded_by     = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='refunds_processed'
    )

    # ── KUPON ──
    coupon = models.ForeignKey(
        'Coupon', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='payments'
    )
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    original_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # ── SANA ──
    created_at   = models.DateTimeField(auto_now_add=True, verbose_name='Sana')
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name        = 'To\'lov'
        verbose_name_plural = 'To\'lovlar'
        ordering = ['-created_at']

    def __str__(self):
        return f'#{str(self.payment_id)[:8]} | {self.user} | ${self.amount} | {self.get_status_display()}'

    def mark_success(self):
        """To'lov muvaffaqiyatli — Pro berish"""
        from django.utils import timezone
        from datetime import timedelta

        self.status       = self.Status.SUCCESS
        self.completed_at = timezone.now()
        self.save(update_fields=['status', 'completed_at'])

        # Foydalanuvchiga Pro berish
        user = self.user
        user.plan = user.PlanType.PRO

        if self.plan == self.PlanType.PRO_YEARLY:
            user.pro_expires_at = timezone.now() + timedelta(days=365)
        else:
            user.pro_expires_at = timezone.now() + timedelta(days=30)

        user.save(update_fields=['plan', 'pro_expires_at'])

        # Subscription yaratish
        Subscription.objects.update_or_create(
            user=user,
            defaults={
                'plan':       self.plan,
                'is_active':  True,
                'started_at': timezone.now(),
                'expires_at': user.pro_expires_at,
                'last_payment': self,
            }
        )


class Subscription(models.Model):
    """Faol obunalar"""
    user     = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE, related_name='subscription'
    )
    plan        = models.CharField(max_length=15)
    is_active   = models.BooleanField(default=True)
    started_at  = models.DateTimeField()
    expires_at  = models.DateTimeField(null=True, blank=True)
    last_payment = models.ForeignKey(
        Payment, on_delete=models.SET_NULL,
        null=True, blank=True
    )
    auto_renew  = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Obuna'
        verbose_name_plural = 'Obunalar'

    def __str__(self):
        return f'{self.user} — {self.plan}'


class Coupon(models.Model):
    """Chegirma kuponlari"""
    code            = models.CharField(max_length=20, unique=True, verbose_name='Kod')
    discount_percent = models.PositiveIntegerField(verbose_name='Chegirma (%)')
    applicable_plan = models.CharField(max_length=20, default='all', verbose_name='Qo\'llaniladigan tarif')
    max_uses        = models.PositiveIntegerField(default=100, verbose_name='Maksimal foydalanish')
    used_count      = models.PositiveIntegerField(default=0, verbose_name='Foydalanilgan')
    valid_from      = models.DateTimeField()
    valid_until     = models.DateTimeField()
    is_active       = models.BooleanField(default=True)
    created_by      = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='created_coupons'
    )
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = 'Kupon'
        verbose_name_plural = 'Kuponlar'

    def __str__(self):
        return f'{self.code} — {self.discount_percent}%'

    @property
    def is_valid(self):
        from django.utils import timezone
        return (
            self.is_active and
            self.used_count < self.max_uses and
            self.valid_from <= timezone.now() <= self.valid_until
        )
