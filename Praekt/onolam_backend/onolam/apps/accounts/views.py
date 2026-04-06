"""
OnOlam — Accounts Views (API)
"""
from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

from .serializers import (
    RegisterSerializer, LoginSerializer,
    UserProfileSerializer, UserListSerializer, ChangePasswordSerializer
)
from .models import LoginAttempt, BlockedIP

User = get_user_model()


class LoginRateThrottle(AnonRateThrottle):
    rate = '10/minute'  # Brute force himoya


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@throttle_classes([LoginRateThrottle])
def register_view(request):
    """
    POST /api/v1/auth/register/
    Yangi foydalanuvchi ro'yxatdan o'tish
    """
    # IP bloklash tekshirish
    ip = get_client_ip(request)
    if BlockedIP.objects.filter(ip_address=ip).exists():
        return Response({'error': 'Kirish taqiqlangan'}, status=status.HTTP_403_FORBIDDEN)

    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user   = serializer.save()
        tokens = get_tokens_for_user(user)
        return Response({
            'message': 'Ro\'yxatdan muvaffaqiyatli o\'tdingiz!',
            'user':    UserProfileSerializer(user).data,
            'tokens':  tokens,
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@throttle_classes([LoginRateThrottle])
def login_view(request):
    """
    POST /api/v1/auth/login/
    Kirish — JWT token qaytaradi
    """
    ip = get_client_ip(request)

    # IP bloklash tekshirish
    if BlockedIP.objects.filter(ip_address=ip).exists():
        return Response({'error': 'Kirish taqiqlangan'}, status=status.HTTP_403_FORBIDDEN)

    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email    = serializer.validated_data['email']
    password = serializer.validated_data['password']

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        _log_attempt(ip, email, False, request)
        return Response({'error': 'Email yoki parol noto\'g\'ri'}, status=status.HTTP_401_UNAUTHORIZED)

    if not user.check_password(password):
        _log_attempt(ip, email, False, request)
        # Brute force: 5+ noto'g'ri urinish
        recent_fails = LoginAttempt.objects.filter(
            ip_address=ip, success=False,
            created_at__gte=timezone.now() - timedelta(minutes=15)
        ).count()
        if recent_fails >= 5:
            from onolam.apps.analytics.models import SecurityEvent
            SecurityEvent.objects.create(
                event_type  = 'brute_force',
                severity    = 'high',
                ip_address  = ip,
                description = f'{recent_fails} marta noto\'g\'ri parol: {email}'
            )
        return Response({'error': 'Email yoki parol noto\'g\'ri'}, status=status.HTTP_401_UNAUTHORIZED)

    if user.is_blocked:
        return Response({'error': f'Akkaunt bloklangan: {user.block_reason}'}, status=status.HTTP_403_FORBIDDEN)

    if not user.is_active:
        return Response({'error': 'Akkaunt faol emas'}, status=status.HTTP_403_FORBIDDEN)

    # Muvaffaqiyatli kirish
    _log_attempt(ip, email, True, request)
    user.last_login_at = timezone.now()
    user.save(update_fields=['last_login_at'])
    user.update_streak()

    tokens = get_tokens_for_user(user)
    return Response({
        'message': 'Xush kelibsiz!',
        'user':    UserProfileSerializer(user).data,
        'tokens':  tokens,
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    """POST /api/v1/auth/logout/"""
    try:
        refresh_token = request.data.get('refresh_token')
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({'message': 'Chiqildi'})
    except Exception:
        return Response({'error': 'Token noto\'g\'ri'}, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    GET  /api/v1/auth/profile/  — Profilni ko'rish
    PUT  /api/v1/auth/profile/  — Profilni yangilash
    PATCH /api/v1/auth/profile/ — Qisman yangilash
    """
    serializer_class   = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def change_password_view(request):
    """POST /api/v1/auth/change-password/"""
    serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'message': 'Parol muvaffaqiyatli o\'zgartirildi'})
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ── ADMIN VIEWS ──

class AdminUserListView(generics.ListAPIView):
    """
    GET /api/v1/auth/admin/users/
    Admin: barcha foydalanuvchilar
    """
    serializer_class   = UserListSerializer
    permission_classes = [permissions.IsAdminUser]
    search_fields      = ['email', 'username', 'first_name', 'last_name']
    filterset_fields   = ['plan', 'is_blocked', 'is_active']
    ordering_fields    = ['created_at', 'last_login_at', 'streak_count']

    def get_queryset(self):
        return User.objects.all().order_by('-created_at')


@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def admin_block_user(request, user_id):
    """POST /api/v1/auth/admin/users/<id>/block/"""
    try:
        user   = User.objects.get(id=user_id)
        reason = request.data.get('reason', '')
        user.block(reason=reason)
        return Response({'message': f'{user.email} bloklandi'})
    except User.DoesNotExist:
        return Response({'error': 'Foydalanuvchi topilmadi'}, status=404)


@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def admin_give_pro(request, user_id):
    """POST /api/v1/auth/admin/users/<id>/give-pro/"""
    try:
        user = User.objects.get(id=user_id)
        days = request.data.get('days', 30)
        user.plan = User.PlanType.PRO
        user.pro_expires_at = timezone.now() + timedelta(days=int(days))
        user.save(update_fields=['plan', 'pro_expires_at'])
        return Response({'message': f'{user.email} ga {days} kunlik Pro berildi'})
    except User.DoesNotExist:
        return Response({'error': 'Foydalanuvchi topilmadi'}, status=404)


# ── HELPERS ──

def get_tokens_for_user(user):
    """JWT access va refresh token yaratish"""
    refresh = RefreshToken.for_user(user)
    return {
        'access':  str(refresh.access_token),
        'refresh': str(refresh),
    }


def get_client_ip(request):
    """Foydalanuvchi real IP manzilini olish"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '0.0.0.0')


def _log_attempt(ip, email, success, request):
    """Login urinishini loglash"""
    LoginAttempt.objects.create(
        ip_address = ip,
        email      = email,
        success    = success,
        user_agent = request.META.get('HTTP_USER_AGENT', ''),
    )
