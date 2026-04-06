"""
OnOlam — AI Chat Views
Platforma chegarasida ishlovchi yordamchi AI
Foydalanuvchi o'qigan barcha darslar kontekstidan javob beradi
"""
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.conf import settings
from typing import Optional, Tuple
from django.utils import timezone

from .models import KnowledgeBase, ChatSession, ChatMessage


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def chat_message(request):
    """POST /api/v1/ai/chat/"""
    user      = request.user
    message   = request.data.get('message', '').strip()
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
            'error':            'Kunlik limit tugadi',
            'limit':            max_questions,
            'used':             today_count,
            'upgrade_required': not user.is_pro,
            'message':          f'Bugun {max_questions} ta savol limitingiz tugadi. '
                                + ('' if user.is_pro else 'Pro tarifga o\'ting — cheksiz savol!'),
        }, status=429)

    # ── DARS OLISH ──
    lesson = None
    if lesson_id:
        from onolam.apps.courses.models import Lesson
        try:
            lesson = Lesson.objects.get(id=lesson_id)
        except Lesson.DoesNotExist:
            pass

    # ── SESSIYA ──
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

    # ── JAVOB TOPISH ──
    ai_reply, kb_used = _find_answer(message, lesson, user)

    # AI javobini saqlash
    ChatMessage.objects.create(
        session=session,
        role=ChatMessage.Role.AI,
        content=ai_reply,
        kb_used=kb_used,
    )

    return Response({
        'reply':      ai_reply,
        'used_today': today_count + 1,
        'limit':      max_questions,
        'remaining':  max(0, max_questions - today_count - 1),
        'is_pro':     user.is_pro,
    })


def _find_answer(
    question: str,
    lesson=None,
    user=None
) -> Tuple[str, Optional[object]]:
    """
    Javob topish algoritmi:
    1. Foydalanuvchi o'qigan darslar kontekstidan qidirish
    2. KnowledgeBase dan qidirish
    3. Platforma chegarasini tekshirish
    4. Javob topilmasa — ogohlantrish
    """
    question_lower = question.lower()

    # ── 1. FOYDALANUVCHI O'QIGAN DARSLARDAN QIDIRISH ──
    if user:
        from onolam.apps.courses.models import LessonProgress, Lesson
        from onolam.apps.courses.models import Enrollment

        # Foydalanuvchi yozilgan kurslar
        enrolled_courses = Enrollment.objects.filter(
            user=user
        ).values_list('course_id', flat=True)

        # Shu kurslardagi barcha darslar (tugatilgan yoki yo'q)
        accessible_lessons = Lesson.objects.filter(
            course_id__in=enrolled_courses,
            is_published=True
        ).order_by('course_id', 'order')

        # Dars kontentidan qidirish
        best_lesson = None
        best_score  = 0

        for les in accessible_lessons:
            score    = 0
            content  = (les.content or '').lower()
            title    = les.title.lower()

            # Savol so'zlari dars kontentida bormi?
            for word in question_lower.split():
                if len(word) > 3 and word in content:
                    score += 1
                if len(word) > 3 and word in title:
                    score += 2

            if score > best_score:
                best_score  = score
                best_lesson = les

        if best_lesson and best_score >= 2:
            # Dars kontentidan qisqa javob tayyorlash
            content   = best_lesson.content or ''
            # HTML teglarni tozalash
            import re
            clean     = re.sub(r'<[^>]+>', ' ', content)
            clean     = re.sub(r'\s+', ' ', clean).strip()
            short     = clean[:400] + ('...' if len(clean) > 400 else '')

            return (
                f"📚 **{best_lesson.title}** darsidan:\n\n{short}\n\n"
                f"_Bu ma'lumot '{best_lesson.course.title}' kursidan._",
                None
            )

    # ── 2. KNOWLEDGEBASE DAN QIDIRISH ──
    all_kb = KnowledgeBase.objects.filter(is_active=True).order_by('-priority')

    best_kb    = None
    best_score = 0

    for kb in all_kb:
        score    = 0
        keywords = [k.strip().lower() for k in kb.keywords.split(',') if k.strip()]

        for kw in keywords:
            if kw in question_lower:
                score += 2

        if kb.title.lower() in question_lower:
            score += 3

        if score > best_score:
            best_score = score
            best_kb    = kb

    if best_kb and best_score > 0:
        clean_content = best_kb.content.strip()[:400]
        if len(best_kb.content) > 400:
            clean_content += '...'
        return f"**{best_kb.title}**\n\n{clean_content}", best_kb

    # ── 3. PLATFORMA CHEGARASI TEKSHIRISH ──
    off_topic_words = [
        'futbol', 'sport', 'musiqa', 'kino', 'film', 'ovqat',
        'taom', 'retsept', 'siyosat', 'yangilik', 'news',
        'havo', 'ob-havo', 'weather', 'pul', 'dollar',
    ]

    for word in off_topic_words:
        if word in question_lower:
            return (
                "⚠️ Uzr, men faqat **dasturlash va OnOlam platformasi** haqidagi "
                "savollarga javob bera olaman.\n\n"
                "Mavzular: HTML, CSS, JavaScript, Python, SQL, Terminal, Linux, "
                "kurs va darslar haqida savollar.\n\n"
                "Boshqa savol bersangiz yordam beraman! 😊",
                None
            )

    # ── 4. UMUMIY DASTURLASH SAVOLLARI ──
    programming_words = [
        'html', 'css', 'javascript', 'js', 'python', 'sql',
        'linux', 'terminal', 'kod', 'code', 'funksiya', 'function',
        'loop', 'tsikl', 'array', 'massiv', 'object', 'class',
        'variable', 'oʻzgaruvchi', 'if', 'else', 'for', 'while',
        'import', 'module', 'library', 'kutubxona', 'tag', 'teg',
        'style', 'selector', 'div', 'span', 'table', 'form',
        'input', 'button', 'link', 'image', 'rasm',
    ]

    for word in programming_words:
        if word in question_lower:
            _save_unanswered(question)
            return (
                f"🤔 '{question}' haqida aniq ma'lumot topa olmadim.\n\n"
                "Lekin bu mavzu haqida bilimlar bazamizga qo'shilmoqda. "
                "Hozircha quyidagilarni tavsiya qilaman:\n\n"
                "• Dars kontentini to'liq o'qing\n"
                "• Keyingi darslarda bu mavzu yoritilgan bo'lishi mumkin\n"
                "• Admin@onolam.uz ga yozing\n\n"
                "Boshqa savollaringiz bormi? 😊",
                None
            )

    # ── 5. JAVOB TOPILMADI ──
    _save_unanswered(question)
    return (
        "⚠️ Uzr, bu savol **OnOlam platformasi mavzularidan tashqarida**.\n\n"
        "Men faqat quyidagi mavzularda yordam bera olaman:\n"
        "• 🌐 HTML, CSS, JavaScript\n"
        "• 🐍 Python, SQL\n"
        "• 💻 Linux, Terminal\n"
        "• 📚 Kurs va darslar haqida savollar\n\n"
        "Dasturlash bo'yicha savollaringiz bo'lsa, bemalol so'rang! 😊",
        None
    )


def _save_unanswered(question: str):
    """Javobsiz savolni loglash"""
    KnowledgeBase.objects.get_or_create(
        title=f'[Javobsiz] {question[:100]}',
        defaults={
            'category': 'other',
            'content':  '',
            'keywords': '',
            'priority': 0,
            'is_active': False,
        }
    )


class ChatSessionListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        sessions = ChatSession.objects.filter(
            user=request.user
        ).order_by('-updated_at')[:20]

        data = [{
            'id':        s.id,
            'lesson':    s.lesson.title if s.lesson else None,
            'msg_count': s.messages.count(),
            'updated_at': s.updated_at.isoformat(),
        } for s in sessions]

        return Response({'sessions': data})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def session_messages(request, pk):
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
    permission_classes = [permissions.IsAdminUser]

    def list(self, request):
        kb_list = KnowledgeBase.objects.all().order_by('-priority', '-updated_at')
        data = [{
            'id':          kb.id,
            'title':       kb.title,
            'category':    kb.category,
            'keywords':    kb.keywords,
            'priority':    kb.priority,
            'is_active':   kb.is_active,
            'updated_at':  kb.updated_at.isoformat(),
            'token_count': len(kb.content.split()),
        } for kb in kb_list]
        return Response({'knowledge_base': data, 'count': len(data)})


@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def admin_kb_create(request):
    kb = KnowledgeBase.objects.create(
        title     = request.data['title'],
        category  = request.data.get('category', 'other'),
        content   = request.data['content'],
        keywords  = request.data.get('keywords', ''),
        priority  = request.data.get('priority', 5),
        is_active = request.data.get('is_active', True),
    )
    return Response({
        'message': f'Bilim elementi qo\'shildi: {kb.title}',
        'id': kb.id,
    }, status=201)


@api_view(['PUT', 'PATCH', 'DELETE'])
@permission_classes([permissions.IsAdminUser])
def admin_kb_update(request, pk):
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
    unanswered = KnowledgeBase.objects.filter(
        title__startswith='[Javobsiz]',
        is_active=False,
        content='',
    ).order_by('-id')

    data = [{'id': kb.id, 'question': kb.title.replace('[Javobsiz] ', '')} for kb in unanswered]
    return Response({'unanswered': data, 'count': len(data)})
