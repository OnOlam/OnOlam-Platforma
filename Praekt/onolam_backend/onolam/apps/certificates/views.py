"""OnOlam — Certificates Views"""
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.http import FileResponse, Http404
from django.utils import timezone
import io

from .models import Certificate
from onolam.apps.courses.models import Enrollment


class UserCertificateListView(generics.ListAPIView):
    """GET /api/v1/certificates/ — Foydalanuvchi sertifikatlari"""
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        certs = Certificate.objects.filter(
            user=request.user
        ).select_related('course').order_by('-issued_at')

        data = [{
            'cert_id':    str(c.cert_id),
            'course':     c.course.title,
            'course_icon': c.course.icon,
            'issued_at':  c.issued_at.isoformat(),
            'verify_url': c.verify_url,
            'has_pdf':    bool(c.pdf_file),
        } for c in certs]

        return Response({'certificates': data, 'count': len(data)})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def certificate_detail(request, cert_id):
    """GET /api/v1/certificates/<cert_id>/"""
    cert = get_object_or_404(Certificate, cert_id=cert_id, user=request.user)
    return Response({
        'cert_id':    str(cert.cert_id),
        'course':     cert.course.title,
        'user_name':  cert.user.get_full_name(),
        'issued_at':  cert.issued_at.isoformat(),
        'verify_url': cert.verify_url,
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def download_certificate_pdf(request, cert_id):
    """
    GET /api/v1/certificates/<cert_id>/pdf/
    PDF sertifikat generatsiya qilish va yuborish
    """
    cert = get_object_or_404(Certificate, cert_id=cert_id, user=request.user)

    # Agar PDF allaqachon yaratilgan bo'lsa
    if cert.pdf_file:
        return FileResponse(cert.pdf_file.open(), content_type='application/pdf')

    # Yangi PDF yaratish (ReportLab)
    pdf_buffer = _generate_certificate_pdf(cert)

    # Faylga saqlash
    from django.core.files.base import ContentFile
    filename = f'onolam-cert-{cert.cert_id}.pdf'
    cert.pdf_file.save(filename, ContentFile(pdf_buffer.getvalue()))

    pdf_buffer.seek(0)
    response = FileResponse(pdf_buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def verify_certificate(request, cert_id):
    """
    GET /api/v1/certificates/verify/<cert_id>/
    Sertifikatni tekshirish — hammaga ochiq
    """
    try:
        cert = Certificate.objects.select_related('user', 'course').get(cert_id=cert_id)
        return Response({
            'valid':      True,
            'cert_id':    str(cert.cert_id),
            'user_name':  cert.user.get_full_name(),
            'course':     cert.course.title,
            'issued_at':  cert.issued_at.isoformat(),
            'platform':   'OnOlam — onolam.uz',
        })
    except Certificate.DoesNotExist:
        return Response({'valid': False, 'message': 'Sertifikat topilmadi'}, status=404)


def _generate_certificate_pdf(cert):
    """
    ReportLab bilan PDF sertifikat yaratish
    Dizayn: qora fon, neon yashil, professional ko'rinish
    """
    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib.colors import HexColor, white
        from reportlab.lib.units import cm
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont

        buffer     = io.BytesIO()
        page_width, page_height = landscape(A4)
        c = canvas.Canvas(buffer, pagesize=landscape(A4))

        # ── Fon ──
        c.setFillColor(HexColor('#020c02'))
        c.rect(0, 0, page_width, page_height, fill=True, stroke=False)

        # ── Tashqi ramka ──
        c.setStrokeColor(HexColor('#00ff41'))
        c.setLineWidth(1.5)
        c.rect(20, 20, page_width - 40, page_height - 40, fill=False)

        # ── Ichki ramka ──
        c.setStrokeColor(HexColor('#1a3a1a'))
        c.setLineWidth(0.5)
        c.rect(28, 28, page_width - 56, page_height - 56, fill=False)

        # ── Logo ──
        c.setFillColor(HexColor('#00ff41'))
        c.setFont('Helvetica-Bold', 22)
        c.drawCentredString(page_width / 2, page_height - 70, '⚡ ONOLAM')

        # ── Sarlavha ──
        c.setFillColor(HexColor('#3d6b3d'))
        c.setFont('Helvetica', 12)
        c.drawCentredString(page_width / 2, page_height - 100,
                            'USHBU SERTIFIKAT TAQDIM ETILADI')

        # ── Ism ──
        c.setFillColor(HexColor('#e8ffe8'))
        c.setFont('Helvetica-Bold', 36)
        c.drawCentredString(page_width / 2, page_height - 155,
                            cert.user.get_full_name())

        # ── Matn ──
        c.setFillColor(HexColor('#7aad7a'))
        c.setFont('Helvetica', 13)
        c.drawCentredString(page_width / 2, page_height - 195,
                            "muvaffaqiyatli tugatgani uchun")

        # ── Kurs nomi ──
        c.setFillColor(HexColor('#00ff41'))
        c.setFont('Helvetica-Bold', 28)
        c.drawCentredString(page_width / 2, page_height - 240,
                            cert.course.title)

        # ── Chiziq ──
        c.setStrokeColor(HexColor('#1a3a1a'))
        c.setLineWidth(1)
        c.line(page_width / 2 - 100, page_height - 270,
               page_width / 2 + 100, page_height - 270)

        # ── Sana ──
        c.setFillColor(HexColor('#3d6b3d'))
        c.setFont('Helvetica', 11)
        date_str = cert.issued_at.strftime('%d-%B %Y')
        c.drawCentredString(page_width / 2, page_height - 295, date_str)

        # ── Sertifikat ID ──
        c.setFillColor(HexColor('#1f3d1f'))
        c.setFont('Helvetica', 9)
        c.drawCentredString(page_width / 2, 45, f'ID: {cert.cert_id}')
        c.drawCentredString(page_width / 2, 33, f'Tekshirish: onolam.uz/verify/{cert.cert_id}')

        c.save()
        buffer.seek(0)
        return buffer

    except ImportError:
        # ReportLab o'rnatilmagan bo'lsa — bo'sh buffer
        buffer = io.BytesIO(b'PDF generation requires reportlab package')
        return buffer
