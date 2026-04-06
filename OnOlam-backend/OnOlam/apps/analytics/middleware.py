"""
OnOlam — Analytics Middleware
Har bir so'rov uchun avtomatik kuzatuv
"""
from django.utils import timezone
from django.conf import settings
import re


# Kuzatilmaydigan URL lar (statik fayllar, admin API)
SKIP_PATHS = re.compile(
    r'^(/static/|/media/|/favicon|/__debug__|/django-admin/|\.ico$|\.css$|\.js$|\.png$|\.jpg$)'
)

# Bot user-agent lar
BOT_PATTERNS = re.compile(
    r'(bot|crawl|spider|scraper|curl|wget|python-requests|Go-http)',
    re.IGNORECASE
)

# Shubhali VPN/Proxy belgilari
SUSPICIOUS_PATTERNS = re.compile(
    r'(sqlmap|nmap|nikto|masscan|zgrab|burpsuite)',
    re.IGNORECASE
)


class VisitorTrackingMiddleware:
    """
    Har bir HTTP so'rovni kuzatib boradi:
    - Kim kirdi (foydalanuvchi/mehmon)
    - Qaysi sahifaga
    - Qanday qurilmadan
    - Qaysi IP dan
    - Shubhali xatti-harakatlar
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Kuzatishni o'tkazib yuborish
        if SKIP_PATHS.match(request.path):
            return response

        # Faqat HTML sahifalar va API (OPTIONS emas)
        if request.method == 'OPTIONS':
            return response

        try:
            self._track(request, response)
        except Exception:
            pass  # Kuzatuv xatosi asosiy jarayonni to'xtatmasin

        return response

    def _track(self, request, response):
        from .models import PageVisit, SecurityEvent
        from onolam.apps.accounts.models import BlockedIP

        ip = self._get_ip(request)
        ua = request.META.get('HTTP_USER_AGENT', '')

        # Bloklangan IP
        if BlockedIP.objects.filter(ip_address=ip).exists():
            return

        # Bot aniqlash
        is_bot = bool(BOT_PATTERNS.search(ua))

        # Shubhali user-agent
        is_suspicious = bool(SUSPICIOUS_PATTERNS.search(ua))

        # Visitor turi aniqlash
        if request.user.is_authenticated:
            visitor_type = PageVisit.VisitorType.REGISTERED
        elif is_suspicious or is_bot:
            visitor_type = PageVisit.VisitorType.SUSPICIOUS
        else:
            visitor_type = PageVisit.VisitorType.GUEST

        # Qurilma turi
        device_type = self._get_device_type(ua)

        # Brauzer va OS
        browser, os_name = self._parse_ua(ua)

        visit = PageVisit(
            user          = request.user if request.user.is_authenticated else None,
            visitor_type  = visitor_type,
            session_key   = request.session.session_key or '',
            ip_address    = ip,
            path          = request.path[:500],
            method        = request.method,
            status_code   = response.status_code,
            device_type   = device_type,
            browser       = browser,
            os            = os_name,
            user_agent    = ua[:500],
            referrer      = request.META.get('HTTP_REFERER', '')[:500],
            is_bot        = is_bot,
            is_suspicious = is_suspicious,
        )

        if is_suspicious:
            visit.risk_reason = 'Shubhali user-agent'

        visit.save()

        # ── XAVFSIZLIK HODISASI YARATISH ──
        if is_suspicious:
            # Bir IP dan ko'p urinish tekshirish (oxirgi 5 daqiqa)
            recent = PageVisit.objects.filter(
                ip_address=ip,
                is_suspicious=True,
                created_at__gte=timezone.now() - timezone.timedelta(minutes=5)
            ).count()

            if recent >= 10:
                SecurityEvent.objects.get_or_create(
                    event_type  = SecurityEvent.EventType.BOT_DETECTED,
                    ip_address  = ip,
                    is_resolved = False,
                    defaults={
                        'severity':    SecurityEvent.Severity.HIGH,
                        'description': f'Shubhali bot faolligi: {recent} ta so\'rov 5 daqiqada. UA: {ua[:100]}',
                    }
                )

    def _get_ip(self, request) -> str:
        x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded:
            return x_forwarded.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '0.0.0.0')

    def _get_device_type(self, ua: str) -> str:
        ua_lower = ua.lower()
        if any(x in ua_lower for x in ['mobile', 'android', 'iphone', 'ipad']):
            if 'ipad' in ua_lower or 'tablet' in ua_lower:
                return 'tablet'
            return 'mobile'
        return 'desktop'

    def _parse_ua(self, ua: str) -> tuple:
        ua_lower = ua.lower()
        # Brauzer
        if 'firefox' in ua_lower:
            browser = 'Firefox'
        elif 'edg/' in ua_lower:
            browser = 'Edge'
        elif 'chrome' in ua_lower:
            browser = 'Chrome'
        elif 'safari' in ua_lower:
            browser = 'Safari'
        else:
            browser = 'Boshqa'

        # OS
        if 'windows' in ua_lower:
            os_name = 'Windows'
        elif 'android' in ua_lower:
            os_name = 'Android'
        elif 'iphone' in ua_lower or 'ipad' in ua_lower:
            os_name = 'iOS'
        elif 'mac' in ua_lower:
            os_name = 'macOS'
        elif 'linux' in ua_lower:
            os_name = 'Linux'
        else:
            os_name = 'Boshqa'

        return browser, os_name
