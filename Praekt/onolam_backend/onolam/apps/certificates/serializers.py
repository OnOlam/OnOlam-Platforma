"""OnOlam — Certificates Serializers"""
from rest_framework import serializers
from .models import Certificate


class CertificateSerializer(serializers.ModelSerializer):
    course_title = serializers.ReadOnlyField(source='course.title')
    course_icon  = serializers.ReadOnlyField(source='course.icon')
    user_name    = serializers.ReadOnlyField(source='user.get_full_name')
    verify_url   = serializers.ReadOnlyField()

    class Meta:
        model  = Certificate
        fields = ['cert_id', 'course_title', 'course_icon', 'user_name',
                  'issued_at', 'verify_url']
