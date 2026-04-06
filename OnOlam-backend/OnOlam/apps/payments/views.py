"""OnOlam — Payments Views"""
import hashlib
import json
from decimal import Decimal
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils import timezone

from .models import Payment, Subscription, Coupon
from onolam.apps.accounts.views import get_client_ip


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_payment(request):
    """
    POST /api/v1/payments/create/
    To'lov boshlash — PayMe yoki Click URL qaytaradi
    """
    plan   = request.data.get('plan', 'pro_monthly')
    method = request.data.get('method', 'payme')
    coupon_code = request.data.get('coupon', '')

    # Narx aniqlash
    prices = {
        'pro_monthly': Decimal(settings.PRO_MONTHLY_PRICE),
        'pro_yearly':  Decimal(settings.PRO_YEARLY_PRICE),
    }
    amount = prices.get(plan, Decimal('9.00'))
    original_amount = amount
    coupon = None

    # Kupon tekshirish
    if coupon_code:
        try:
            coupon = Coupon.objects.get(code=coupon_code.upper())
            if coupon.is_valid:
                discount = amount * Decimal(coupon.discount_percent) / 100
                amount   = amount - discount
            else:
                return Response({'error': 'Kupon yaroqsiz yoki muddati o\'tgan'}, status=400)
        except Coupon.DoesNotExist:
            return Response({'error': 'Kupon topilmadi'}, status=400)

    # Payment yaratish
    payment = Payment.objects.create(
        user            = request.user,
        amount          = amount,
        original_amount = original_amount,
        discount_amount = original_amount - amount,
        method          = method,
        plan            = plan,
        coupon          = coupon,
        status          = Payment.Status.PENDING,
    )

    # To'lov URL yaratish
    if method == 'payme':
        checkout_url = _payme_checkout_url(payment)
    elif method == 'click':
        checkout_url = _click_checkout_url(payment)
    else:
        # Demo uchun — haqiqiy integratsiyasiz
        checkout_url = f'/payment/demo/{payment.payment_id}/'

    return Response({
        'payment_id':   str(payment.payment_id),
        'amount':       float(amount),
        'checkout_url': checkout_url,
    })


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def verify_coupon(request):
    """POST /api/v1/payments/verify/ — Kupon tekshirish"""
    code = request.data.get('code', '').upper()
    try:
        coupon = Coupon.objects.get(code=code)
        if coupon.is_valid:
            return Response({
                'valid':    True,
                'discount': coupon.discount_percent,
                'message':  f'{coupon.discount_percent}% chegirma qo\'llanadi!',
            })
        return Response({'valid': False, 'message': 'Kupon yaroqsiz'})
    except Coupon.DoesNotExist:
        return Response({'valid': False, 'message': 'Kupon topilmadi'})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def payme_webhook(request):
    """
    POST /api/v1/payments/payme/webhook/
    PayMe to'lov tizimidan kelgan xabarlar
    """
    try:
        data       = request.data
        method     = data.get('method')
        params     = data.get('params', {})
        payment_id = params.get('account', {}).get('payment_id')

        if method == 'PerformTransaction':
            payment = Payment.objects.get(payment_id=payment_id)
            payment.external_id = params.get('id', '')
            payment.mark_success()

            return Response({
                'result': {
                    'transaction': str(payment.payment_id),
                    'perform_time': int(timezone.now().timestamp() * 1000),
                    'state': 2,
                }
            })

    except Payment.DoesNotExist:
        return Response({'error': {'code': -31050, 'message': 'To\'lov topilmadi'}})
    except Exception as e:
        return Response({'error': {'code': -32400, 'message': str(e)}})

    return Response({'result': 'ok'})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def click_webhook(request):
    """POST /api/v1/payments/click/webhook/"""
    try:
        payment_id = request.data.get('merchant_trans_id')
        error_code = int(request.data.get('error', 0))

        if error_code == 0:
            payment = Payment.objects.get(payment_id=payment_id)
            payment.external_id = request.data.get('click_trans_id', '')
            payment.mark_success()
            return Response({'error': 0, 'error_note': 'Success'})

    except Payment.DoesNotExist:
        return Response({'error': -5, 'error_note': 'User not found'})

    return Response({'error': 0})


class PaymentHistoryView(generics.ListAPIView):
    """GET /api/v1/payments/history/"""
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        payments = Payment.objects.filter(
            user=request.user
        ).order_by('-created_at')[:50]

        data = [{
            'id':         str(p.payment_id),
            'amount':     float(p.amount),
            'plan':       p.plan,
            'method':     p.method,
            'status':     p.status,
            'created_at': p.created_at.isoformat(),
        } for p in payments]

        return Response({'payments': data})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def subscription_status(request):
    """GET /api/v1/payments/subscription/"""
    user = request.user
    return Response({
        'plan':          user.plan,
        'is_pro':        user.is_pro,
        'expires_at':    user.pro_expires_at.isoformat() if user.pro_expires_at else None,
        'auto_renew':    getattr(getattr(user, 'subscription', None), 'auto_renew', False),
    })


# ── ADMIN ──

class AdminPaymentListView(generics.ListAPIView):
    """GET /api/v1/payments/admin/list/"""
    permission_classes = [permissions.IsAdminUser]

    def list(self, request):
        from django.db.models import Sum, Count
        payments = Payment.objects.all().select_related('user').order_by('-created_at')

        total_revenue = Payment.objects.filter(
            status=Payment.Status.SUCCESS
        ).aggregate(total=Sum('amount'))['total'] or 0

        data = [{
            'id':         str(p.payment_id),
            'user':       p.user.email if p.user else '—',
            'amount':     float(p.amount),
            'plan':       p.plan,
            'method':     p.method,
            'status':     p.status,
            'created_at': p.created_at.isoformat(),
        } for p in payments[:100]]

        return Response({
            'total_revenue': float(total_revenue),
            'payments':      data,
        })


@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def admin_refund(request, payment_id):
    """POST /api/v1/payments/admin/<id>/refund/"""
    try:
        payment = Payment.objects.get(payment_id=payment_id)
        payment.status      = Payment.Status.REFUNDED
        payment.refunded_at = timezone.now()
        payment.refund_reason = request.data.get('reason', '')
        payment.refunded_by  = request.user
        payment.save()

        # Pro ni olish
        if payment.user:
            payment.user.plan = 'free'
            payment.user.save(update_fields=['plan'])

        return Response({'message': 'Qaytarildi'})
    except Payment.DoesNotExist:
        return Response({'error': 'To\'lov topilmadi'}, status=404)


class AdminCouponListView(generics.ListAPIView):
    """GET /api/v1/payments/admin/coupons/"""
    permission_classes = [permissions.IsAdminUser]

    def list(self, request):
        coupons = Coupon.objects.all().order_by('-created_at')
        data = [{
            'id':               c.id,
            'code':             c.code,
            'discount_percent': c.discount_percent,
            'max_uses':         c.max_uses,
            'used_count':       c.used_count,
            'is_valid':         c.is_valid,
            'valid_until':      c.valid_until.isoformat(),
        } for c in coupons]
        return Response({'coupons': data})


@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def admin_create_coupon(request):
    """POST /api/v1/payments/admin/coupons/create/"""
    from django.utils.dateparse import parse_datetime
    coupon = Coupon.objects.create(
        code             = request.data['code'].upper(),
        discount_percent = request.data['discount_percent'],
        max_uses         = request.data.get('max_uses', 100),
        valid_from       = parse_datetime(request.data['valid_from']) or timezone.now(),
        valid_until      = parse_datetime(request.data['valid_until']),
        applicable_plan  = request.data.get('applicable_plan', 'all'),
        created_by       = request.user,
    )
    return Response({'message': f'Kupon yaratildi: {coupon.code}'}, status=201)


# ── HELPERS ──

def _payme_checkout_url(payment):
    import base64
    params = f'm={settings.PAYME_ID};ac.payment_id={payment.payment_id};a={int(payment.amount * 100)}'
    encoded = base64.b64encode(params.encode()).decode()
    return f'{settings.PAYME_URL}/{encoded}'


def _click_checkout_url(payment):
    return (
        f'https://my.click.uz/services/pay?'
        f'service_id={settings.CLICK_SERVICE_ID}'
        f'&merchant_id={settings.CLICK_MERCHANT_ID}'
        f'&amount={payment.amount}'
        f'&transaction_param={payment.payment_id}'
    )
