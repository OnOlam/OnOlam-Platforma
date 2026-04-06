"""
OnOlam — Accounts Serializers
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    """Ro'yxatdan o'tish"""
    password  = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model  = User
        fields = ['email', 'username', 'first_name', 'last_name', 'password', 'password2']

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password2'):
            raise serializers.ValidationError({'password': 'Parollar mos kelmadi'})
        return attrs

    def validate_email(self, value):
        # Bloklangan email tekshirish
        from onolam.apps.accounts.models import BlockedEmail
        for blocked in BlockedEmail.objects.all():
            if blocked.email_or_domain.startswith('*@'):
                domain = blocked.email_or_domain[2:]
                if value.endswith(f'@{domain}'):
                    raise serializers.ValidationError('Bu email manzili ruxsat etilmagan')
            elif value.lower() == blocked.email_or_domain.lower():
                raise serializers.ValidationError('Bu email manzili bloklangan')
        return value

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    """Kirish"""
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class UserProfileSerializer(serializers.ModelSerializer):
    """Foydalanuvchi profili"""
    full_name      = serializers.ReadOnlyField(source='get_full_name')
    is_pro         = serializers.ReadOnlyField()
    enrolled_count = serializers.SerializerMethodField()
    cert_count     = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'full_name', 'bio', 'avatar', 'phone', 'location', 'website',
            'plan', 'is_pro', 'pro_expires_at',
            'streak_count', 'max_streak', 'last_activity',
            'created_at', 'enrolled_count', 'cert_count',
        ]
        read_only_fields = ['email', 'plan', 'is_pro', 'pro_expires_at', 'created_at']

    def get_enrolled_count(self, obj):
        return obj.enrollments.count()

    def get_cert_count(self, obj):
        return obj.certificates.count()


class UserListSerializer(serializers.ModelSerializer):
    """Admin uchun user ro'yxati"""
    is_pro    = serializers.ReadOnlyField()
    full_name = serializers.ReadOnlyField(source='get_full_name')

    class Meta:
        model  = User
        fields = [
            'id', 'email', 'username', 'full_name', 'avatar',
            'plan', 'is_pro', 'is_blocked', 'is_active',
            'streak_count', 'created_at', 'last_login_at',
        ]


class ChangePasswordSerializer(serializers.Serializer):
    """Parol o'zgartirish"""
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Joriy parol noto\'g\'ri')
        return value
