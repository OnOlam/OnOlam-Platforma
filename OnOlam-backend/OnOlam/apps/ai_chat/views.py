"""
OnOlam — AI Chat Views
Platforma chegarasida ishlovchi yordamchi AI
"""
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.conf import settings
from typing import Optional, Tuple
from django.utils import timezone
from django.db.models import Q

from .models import KnowledgeBase, ChatSession, ChatMessage


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def chat_message(request):
    """
    POST /api/v1/ai/chat/
    Foydalanuvchi savolini qabul qilib, javob qaytaradi

    Body: { "message": "...", "lesson_id": (ixtiyoriy) }
    """
    user    = request.user
    message = request.data.get('message', '').strip()
    lesson_id = request.data.get('lesson_id')

    if not message:
        return Response({'error': 'Xabar bo\'sh bo\'lishi mumkin emas'}, status=400)

    if len(message) > 500:
        return Response({'error': 'Xabar 500 ta belgidan oshmasligi kerak'}, status=400)

    # ── LIMIT TEKSHIRISH ──
    max_questions = (
        settings.AI_MAX_PRO_QUESTIONS_PER_DAY
        if user.is_pro
        else settings.AI_MAX_FREE_QUESTIONS_PER_DAY
    )

    today_start = timezone.now().replace(hour=0, minute=0, second=0)
    today_count = ChatMessage.objects.filter(
        session__user=user,
        role=ChatMessage.Role.USER,
        created_at__gte=today_start,
    ).count()

    if today_count >= max_questions:
        return Response({
            'error':           'Kunlik limit tugadi',
            'limit':           max_questions,
            'used':            today_count,
            'upgrade_required': not user.is_pro,
            'message':         f'Bugun {max_questions} ta savol limitingiz tugadi. '
                               + ('' if user.is_pro else 'Pro tarifga o\'ting — cheksiz savol!'),
        }, status=429)

    # ── SESSIYA OLISH YOKI YARATISH ──
    lesson = None
    if lesson_id:
        from onolam.apps.courses.models import Lesson
        try:
            lesson = Lesson.objects.get(id=lesson_id)
        except Lesson.DoesNotExist:
            pass

    session, _ = ChatSession.objects.get_or_create(
        user=user,
        lesson=lesson,
        defaults={'created_at': timezone.now()}
    )

    # Foydalanuvchi xabarini saqlash
    ChatMessage.objects.create(
        session=session,
        role=ChatMessage.Role.USER,
        content=message,
    )

    # ── AI JAVOB TOPISH ──
    ai_reply, kb_used = _find_answer(message, lesson)

    # AI javobini saqlash
    ChatMessage.objects.create(
        session=session,
        role=ChatMessage.Role.AI,
        content=ai_reply,
        kb_used=kb_used,
    )

    return Response({
        'reply':     ai_reply,
        'used_today': today_count + 1,
        'limit':      max_questions,
        'remaining':  max(0, max_questions - today_count - 1),
    })


def _find_answer(question: str, lesson=None) -> Tuple[str, Optional[object]]:
    """
    Savolga javob topish algoritmi:
    1. Kalit so'zlar bo'yicha bilimlar bazasini qidirish
    2. Topilmasa — standart javob
    """
    question_lower = question.lower()

    # ── 1. DARS KONTEKSTI ──
    if lesson and lesson.ai_content:
        kb_lesson = KnowledgeBase.objects.filter(
            related_course=lesson.course, is_active=True
        ).first()
        if kb_lesson:
            reply = _context_reply(question_lower, kb_lesson.content, lesson.title)
            if reply:
                return reply, kb_lesson

    # ── 2. BARCHA BILIMLAR BAZASINI QIDIRISH ──
    all_kb = KnowledgeBase.objects.filter(is_active=True).order_by('-priority')

    best_match = None
    best_score = 0

    for kb in all_kb:
        score = 0
        keywords = [k.strip().lower() for k in kb.keywords.split(',') if k.strip()]

        for kw in keywords:
            if kw in question_lower:
                score += 2  # Kalit so'z topildi

        if kb.title.lower() in question_lower:
            score += 3  # Sarlavha mos keldi

        if score > best_score:
            best_score = score
            best_match = kb

    if best_match and best_score > 0:
        reply = _extract_relevant_answer(question_lower, best_match.content, best_match.title)
        return reply, best_match

    # ── 3. KATEGORIYA BO'YICHA QIDIRISH ──
    category_map = {
        'narx': 'payment', 'to\'lov': 'payment', 'pro': 'payment',
        'pullik': 'payment', 'obuna': 'payment',
        'html': 'course', 'css': 'course', 'javascript': 'course',
        'python': 'course', 'sql': 'course', 'termux': 'course',
        'linux': 'course', 'kurs': 'course', 'dars': 'course',
        'sertifikat': 'course', 'certificate': 'course',
    }

    for keyword, category in category_map.items():
        if keyword in question_lower:
            kb = KnowledgeBase.objects.filter(
                category=category, is_active=True
            ).order_by('-priority').first()
            if kb:
                return _extract_relevant_answer(question_lower, kb.content, kb.title), kb

    # ── 4. JAVOB TOPILMADI ──
    _save_unanswered(question)
    return (
        "Uzr, bu savol haqida ma'lumotim yo'q. "
        "Platformaning asosiy mavzulari: HTML, CSS, JavaScript, Python, SQL, Termux, Linux. "
        "Boshqa savollaringiz bo'lsa, admin@onolam.uz ga yozing.",
        None
    )


def _context_reply(question: str, content: str, context_title: str) -> Optional[str]:
    """Dars kontekstida javob topish"""
    lines = content.split('\n')
    for line in lines:
        if len(line) > 20 and any(word in line.lower() for word in question.split() if len(word) > 3):
            return f"{context_title} bo'yicha: {line.strip()}"
    return None


def _extract_relevant_answer(question: str, content: str, title: str) -> str:
    """Kontentdan eng mos qismni chiqarish"""
    # Qisqa javob yaratish — birinchi 300 ta belgi
    clean_content = content.strip()[:400]
    if len(content) > 400:
        clean_content += '...'
    return f"**{title}**\n\n{clean_content}"


def _save_unanswered(question: str):
    """Javobsiz savolni loglash — admin ko'rishi uchun"""
    # Bilimlar bazasida "unanswered" kategoriyasida saqlash
    # Admin bu savollarni ko'rib, javob qo'shadi
    KnowledgeBase.objects.get_or_create(
        title=f'[Javobsiz] {question[:100]}',
        defaults={
            'category': 'other',
            'content':  '',
            'keywords': '',
            'priority': 0,
            'is_active': False,  # Admin aktiv qilguncha ko'rinmaydi
        }
    )


class ChatSessionListView(generics.ListAPIView):
    """GET /api/v1/ai/sessions/"""
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        sessions = ChatSession.objects.filter(
            user=request.user
        ).order_by('-updated_at')[:20]

        data = [{
            'id':         s.id,
            'lesson':     s.lesson.title if s.lesson else None,
            'msg_count':  s.messages.count(),
            'updated_at': s.updated_at.isoformat(),
        } for s in sessions]

        return Response({'sessions': data})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def session_messages(request, pk):
    """GET /api/v1/ai/sessions/<pk>/messages/"""
    session = ChatSession.objects.filter(id=pk, user=request.user).first()
    if not session:
        return Response({'error': 'Sessiya topilmadi'}, status=404)

    messages = session.messages.all().order_by('created_at')
    data = [{
        'role':       m.role,
        'content':    m.content,
        'created_at': m.created_at.isoformat(),
    } for m in messages]

    return Response({'messages': data})


# ── ADMIN VIEWS ──

class AdminKBListView(generics.ListAPIView):
    """GET /api/v1/ai/admin/kb/"""
    permission_classes = [permissions.IsAdminUser]

    def list(self, request):
        kb_list = KnowledgeBase.objects.all().order_by('-priority', '-updated_at')
        data = [{
            'id':         kb.id,
            'title':      kb.title,
            'category':   kb.category,
            'keywords':   kb.keywords,
            'priority':   kb.priority,
            'is_active':  kb.is_active,
            'updated_at': kb.updated_at.isoformat(),
            'token_count': len(kb.content.split()),
        } for kb in kb_list]
        return Response({'knowledge_base': data, 'count': len(data)})


@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def admin_kb_create(request):
    """POST /api/v1/ai/admin/kb/create/"""
    kb = KnowledgeBase.objects.create(
        title      = request.data['title'],
        category   = request.data.get('category', 'other'),
        content    = request.data['content'],
        keywords   = request.data.get('keywords', ''),
        priority   = request.data.get('priority', 5),
        is_active  = request.data.get('is_active', True),
    )
    return Response({
        'message': f'Bilim elementi qo\'shildi: {kb.title}',
        'id': kb.id,
    }, status=201)


@api_view(['PUT', 'PATCH', 'DELETE'])
@permission_classes([permissions.IsAdminUser])
def admin_kb_update(request, pk):
    """PUT/DELETE /api/v1/ai/admin/kb/<pk>/"""
    try:
        kb = KnowledgeBase.objects.get(pk=pk)
    except KnowledgeBase.DoesNotExist:
        return Response({'error': 'Topilmadi'}, status=404)

    if request.method == 'DELETE':
        kb.delete()
        return Response({'message': 'O\'chirildi'})

    for field in ['title', 'category', 'content', 'keywords', 'priority', 'is_active']:
        if field in request.data:
            setattr(kb, field, request.data[field])
    kb.save()
    return Response({'message': 'Yangilandi', 'id': kb.id})


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def unanswered_questions(request):
    """GET /api/v1/ai/admin/unanswered/"""
    unanswered = KnowledgeBase.objects.filter(
        title__startswith='[Javobsiz]',
        is_active=False,
        content='',
    ).order_by('-id')

    data = [{'id': kb.id, 'question': kb.title.replace('[Javobsiz] ', '')} for kb in unanswered]
    return Response({'unanswered': data, 'count': len(data)})
