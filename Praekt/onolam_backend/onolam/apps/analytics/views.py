"""OnOlam — Analytics Views (Admin uchun)"""
from rest_framework import generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta

from .models import PageVisit, SecurityEvent


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def analytics_dashboard(request):
    """
    GET /api/v1/analytics/dashboard/
    Asosiy statistika — admin dashboard uchun
    """
    now   = timezone.now()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago  = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    # Asosiy raqamlar
    total_visits   = PageVisit.objects.count()
    today_visits   = PageVisit.objects.filter(created_at__gte=today).count()
    online_now     = PageVisit.objects.filter(
        created_at__gte=now - timedelta(minutes=5)
    ).values('ip_address').distinct().count()

    # Foydalanuvchilar
    from django.contrib.auth import get_user_model
    User = get_user_model()
    total_users  = User.objects.count()
    today_users  = User.objects.filter(created_at__gte=today).count()
    pro_users    = User.objects.filter(plan='pro').count()
    free_users   = total_users - pro_users
    blocked_users = User.objects.filter(is_blocked=True).count()

    # To'lovlar
    from onolam.apps.payments.models import Payment
    from django.db.models import Sum
    monthly_revenue = Payment.objects.filter(
        status='success',
        created_at__gte=month_ago
    ).aggregate(total=Sum('amount'))['total'] or 0

    # Xavfsizlik
    unresolved_threats = SecurityEvent.objects.filter(is_resolved=False).count()
    suspicious_visits  = PageVisit.objects.filter(
        is_suspicious=True, created_at__gte=today
    ).count()

    # Haftalik grafik (so'ngi 7 kun)
    daily_stats = []
    for i in range(6, -1, -1):
        day_start = today - timedelta(days=i)
        day_end   = day_start + timedelta(days=1)
        count     = PageVisit.objects.filter(
            created_at__gte=day_start,
            created_at__lt=day_end
        ).count()
        new_users = User.objects.filter(
            created_at__gte=day_start,
            created_at__lt=day_end
        ).count()
        daily_stats.append({
            'date':      day_start.strftime('%d-%m'),
            'visits':    count,
            'new_users': new_users,
        })

    # Eng ko'p ko'rilgan sahifalar
    top_pages = PageVisit.objects.filter(
        created_at__gte=month_ago
    ).values('path').annotate(
        count=Count('id')
    ).order_by('-count')[:10]

    # Qurilmalar
    devices = PageVisit.objects.filter(
        created_at__gte=month_ago
    ).values('device_type').annotate(count=Count('id'))

    # Brauzerlar
    browsers = PageVisit.objects.filter(
        created_at__gte=month_ago
    ).values('browser').annotate(count=Count('id')).order_by('-count')[:5]

    return Response({
        'overview': {
            'total_visits':      total_visits,
            'today_visits':      today_visits,
            'online_now':        online_now,
            'total_users':       total_users,
            'today_new_users':   today_users,
            'pro_users':         pro_users,
            'free_users':        free_users,
            'blocked_users':     blocked_users,
            'monthly_revenue':   float(monthly_revenue),
            'unresolved_threats': unresolved_threats,
            'suspicious_today':  suspicious_visits,
        },
        'daily_stats':  list(daily_stats),
        'top_pages':    list(top_pages),
        'devices':      list(devices),
        'browsers':     list(browsers),
    })


class VisitorListView(generics.ListAPIView):
    """GET /api/v1/analytics/visitors/"""
    permission_classes = [permissions.IsAdminUser]

    def list(self, request):
        # Filtrlar
        visitor_type = request.query_params.get('type')
        date_filter  = request.query_params.get('date', 'today')

        qs = PageVisit.objects.select_related('user').order_by('-created_at')

        if visitor_type:
            qs = qs.filter(visitor_type=visitor_type)

        now   = timezone.now()
        today = now.replace(hour=0, minute=0, second=0)

        if date_filter == 'today':
            qs = qs.filter(created_at__gte=today)
        elif date_filter == 'week':
            qs = qs.filter(created_at__gte=now - timedelta(days=7))

        qs = qs[:200]

        data = [{
            'id':           v.id,
            'visitor_type': v.visitor_type,
            'ip_address':   v.ip_address,
            'user':         v.user.email if v.user else None,
            'path':         v.path,
            'device_type':  v.device_type,
            'browser':      v.browser,
            'os':           v.os,
            'country':      v.country,
            'referrer':     v.referrer,
            'is_bot':       v.is_bot,
            'is_suspicious': v.is_suspicious,
            'status_code':  v.status_code,
            'created_at':   v.created_at.isoformat(),
        } for v in qs]

        return Response({'visitors': data, 'count': len(data)})


class SecurityEventListView(generics.ListAPIView):
    """GET /api/v1/analytics/security/"""
    permission_classes = [permissions.IsAdminUser]

    def list(self, request):
        events = SecurityEvent.objects.select_related(
            'user', 'resolved_by'
        ).order_by('-created_at')[:100]

        data = [{
            'id':          e.id,
            'event_type':  e.event_type,
            'severity':    e.severity,
            'ip_address':  e.ip_address,
            'user':        e.user.email if e.user else None,
            'description': e.description,
            'is_resolved': e.is_resolved,
            'created_at':  e.created_at.isoformat(),
        } for e in events]

        return Response({'events': data, 'count': len(data)})


@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def resolve_security_event(request, pk):
    """POST /api/v1/analytics/security/<pk>/resolve/"""
    try:
        event = SecurityEvent.objects.get(pk=pk)
        event.is_resolved = True
        event.resolved_by = request.user
        event.resolved_at = timezone.now()
        event.save()
        return Response({'message': 'Hodisa hal qilindi'})
    except SecurityEvent.DoesNotExist:
        return Response({'error': 'Topilmadi'}, status=404)


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def page_stats(request):
    """GET /api/v1/analytics/pages/"""
    month_ago = timezone.now() - timedelta(days=30)

    pages = PageVisit.objects.filter(
        created_at__gte=month_ago
    ).values('path').annotate(
        total=Count('id'),
        unique_ips=Count('ip_address', distinct=True),
        registered=Count('id', filter=Q(visitor_type='registered')),
    ).order_by('-total')[:20]

    return Response({'pages': list(pages)})


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def realtime_stats(request):
    """GET /api/v1/analytics/realtime/ — Hozir onlayn"""
    now = timezone.now()

    # So'ngi 5 daqiqada
    recent = PageVisit.objects.filter(
        created_at__gte=now - timedelta(minutes=5)
    ).select_related('user').order_by('-created_at')[:50]

    active_pages = PageVisit.objects.filter(
        created_at__gte=now - timedelta(minutes=5)
    ).values('path').annotate(count=Count('id')).order_by('-count')[:5]

    online_registered = recent.filter(visitor_type='registered').count()
    online_guests     = recent.filter(visitor_type='guest').count()
    online_suspicious = recent.filter(visitor_type='suspicious').count()

    data = [{
        'ip':      v.ip_address,
        'user':    v.user.email if v.user else None,
        'path':    v.path,
        'device':  v.device_type,
        'browser': v.browser,
        'type':    v.visitor_type,
        'time':    v.created_at.isoformat(),
    } for v in recent[:20]]

    return Response({
        'total_online':    online_registered + online_guests,
        'registered':      online_registered,
        'guests':          online_guests,
        'suspicious':      online_suspicious,
        'active_pages':    list(active_pages),
        'recent_visitors': data,
        'timestamp':       now.isoformat(),
    })
