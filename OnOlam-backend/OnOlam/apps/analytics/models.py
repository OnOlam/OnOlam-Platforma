"""
OnOlam — Analytics Models
Tashrif buyuruvchilar kuzatuvi, xavfsizlik
"""
from django.db import models
from django.conf import settings


class PageVisit(models.Model):
    """Sahifa tashrif kuzatuvi"""

    class VisitorType(models.TextChoices):
        REGISTERED = 'registered', 'Ro\'yxatdan o\'tgan'
        GUEST      = 'guest',      'Mehmon'
        SUSPICIOUS = 'suspicious', 'Shubhali'
        BLOCKED    = 'blocked',    'Bloklangan'

    class DeviceType(models.TextChoices):
        MOBILE  = 'mobile',  'Mobil'
        DESKTOP = 'desktop', 'Kompyuter'
        TABLET  = 'tablet',  'Planshet'
        BOT     = 'bot',     'Bot'

    # ── KIM ──
    user          = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='page_visits'
    )
    visitor_type  = models.CharField(max_length=15, choices=VisitorType.choices, default=VisitorType.GUEST)
    session_key   = models.CharField(max_length=100, blank=True)

    # ── QAYERDAN ──
    ip_address    = models.GenericIPAddressField()
    country       = models.CharField(max_length=50, blank=True)
    city          = models.CharField(max_length=100, blank=True)
    referrer      = models.URLField(blank=True, verbose_name='Qayerdan keldi')
    utm_source    = models.CharField(max_length=100, blank=True)

    # ── NIMA ──
    path          = models.CharField(max_length=500, verbose_name='Sahifa URL')
    method        = models.CharField(max_length=10, default='GET')
    status_code   = models.PositiveIntegerField(default=200)

    # ── QURILMA ──
    device_type   = models.CharField(max_length=10, choices=DeviceType.choices, default=DeviceType.DESKTOP)
    browser       = models.CharField(max_length=50, blank=True)
    os            = models.CharField(max_length=50, blank=True)
    user_agent    = models.TextField(blank=True)

    # ── XAVF ──
    is_suspicious = models.BooleanField(default=False)
    risk_reason   = models.CharField(max_length=200, blank=True)
    is_vpn        = models.BooleanField(default=False)
    is_bot        = models.BooleanField(default=False)

    # ── VAQT ──
    created_at    = models.DateTimeField(auto_now_add=True)
    duration_sec  = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name        = 'Sahifa tashrifi'
        verbose_name_plural = 'Sahifa tashrif kuzatuvi'
        ordering = ['-created_at']
        indexes  = [
            models.Index(fields=['ip_address']),
            models.Index(fields=['path']),
            models.Index(fields=['created_at']),
            models.Index(fields=['visitor_type']),
        ]

    def __str__(self):
        return f'{self.ip_address} → {self.path} ({self.created_at.strftime("%d.%m %H:%M")})'


class SecurityEvent(models.Model):
    """Xavfsizlik hodisalari — hujum urinishlari"""

    class EventType(models.TextChoices):
        BRUTE_FORCE   = 'brute_force',   'Brute Force'
        SUSPICIOUS_REG = 'suspicious_reg', 'Shubhali ro\'yxat'
        BOT_DETECTED  = 'bot_detected',  'Bot aniqlandi'
        IP_BLOCKED    = 'ip_blocked',    'IP Bloklandi'
        SQL_INJECTION = 'sql_injection', 'SQL Injection urinishi'
        XSS_ATTEMPT   = 'xss_attempt',   'XSS Urinishi'
        OTHER         = 'other',         'Boshqa'

    class Severity(models.TextChoices):
        LOW    = 'low',    'Past'
        MEDIUM = 'medium', 'O\'rta'
        HIGH   = 'high',   'Yuqori'
        CRITICAL = 'critical', 'Kritik'

    event_type = models.CharField(max_length=20, choices=EventType.choices)
    severity   = models.CharField(max_length=10, choices=Severity.choices, default=Severity.MEDIUM)
    ip_address = models.GenericIPAddressField()
    user       = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True
    )
    description = models.TextField()
    is_resolved = models.BooleanField(default=False)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='resolved_events'
    )
    created_at  = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name        = 'Xavfsizlik hodisasi'
        verbose_name_plural = 'Xavfsizlik hodisalari'
        ordering = ['-created_at']

    def __str__(self):
        return f'[{self.severity.upper()}] {self.get_event_type_display()} — {self.ip_address}'
