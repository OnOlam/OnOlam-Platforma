"""OnOlam — Courses Views"""
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import Course, Lesson, Category, Enrollment, LessonProgress
from .serializers import (
    CourseListSerializer, CourseDetailSerializer,
    LessonDetailSerializer, LessonListSerializer, CategorySerializer
)
from onolam.apps.accounts.views import get_client_ip


class IsPro(permissions.BasePermission):
    """Faqat Pro foydalanuvchilar"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_pro


class CategoryListView(generics.ListAPIView):
    """GET /api/v1/courses/categories/"""
    queryset           = Category.objects.all()
    serializer_class   = CategorySerializer
    permission_classes = [permissions.AllowAny]


class CourseListView(generics.ListAPIView):
    """GET /api/v1/courses/"""
    serializer_class   = CourseListSerializer
    permission_classes = [permissions.AllowAny]
    search_fields      = ['title', 'description', 'tags']
    filterset_fields   = ['access_type', 'difficulty', 'category']

    def get_queryset(self):
        return Course.objects.filter(is_published=True).select_related('category')


class CourseDetailView(generics.RetrieveAPIView):
    """GET /api/v1/courses/<slug>/"""
    serializer_class   = CourseDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field       = 'slug'

    def get_queryset(self):
        return Course.objects.filter(is_published=True).prefetch_related('lessons')


class CourseLessonsView(generics.ListAPIView):
    """GET /api/v1/courses/<slug>/lessons/"""
    serializer_class   = LessonListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        course = get_object_or_404(Course, slug=self.kwargs['slug'], is_published=True)
        return course.lessons.filter(is_published=True)


class LessonDetailView(generics.RetrieveAPIView):
    """GET /api/v1/courses/lessons/<pk>/"""
    serializer_class   = LessonDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Lesson.objects.filter(is_published=True)

    def retrieve(self, request, *args, **kwargs):
        lesson = self.get_object()
        # Pro tekshirish
        if lesson.access_type == 'pro' and not request.user.is_pro:
            return Response(
                {'error': 'Bu dars Pro foydalanuvchilar uchun', 'upgrade_required': True},
                status=status.HTTP_403_FORBIDDEN
            )
        # Streak yangilash
        request.user.update_streak()
        return super().retrieve(request, *args, **kwargs)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def enroll_course(request, slug):
    """POST /api/v1/courses/<slug>/enroll/"""
    course = get_object_or_404(Course, slug=slug, is_published=True)

    # Pro kurs tekshirish
    if course.access_type == 'pro' and not request.user.is_pro:
        return Response(
            {'error': 'Bu kurs Pro foydalanuvchilar uchun', 'upgrade_required': True},
            status=status.HTTP_403_FORBIDDEN
        )

    enrollment, created = Enrollment.objects.get_or_create(
        user=request.user, course=course
    )

    if created:
        return Response({'message': f'{course.title} kursiga yozildingiz!', 'enrolled': True}, status=201)
    return Response({'message': 'Siz allaqachon yozilgansiz', 'enrolled': True})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def complete_lesson(request, pk):
    """POST /api/v1/courses/lessons/<pk>/complete/"""
    lesson     = get_object_or_404(Lesson, pk=pk, is_published=True)
    enrollment = get_object_or_404(Enrollment, user=request.user, course=lesson.course)

    progress, _ = LessonProgress.objects.get_or_create(
        enrollment=enrollment, lesson=lesson
    )

    # Quiz tekshirish
    quiz_answer_id = request.data.get('quiz_answer_id')
    if quiz_answer_id and hasattr(lesson, 'quiz'):
        from .models import QuizOption
        try:
            option = lesson.quiz.options.get(id=quiz_answer_id)
            progress.quiz_answer = option
            progress.quiz_passed = option.is_correct
        except QuizOption.DoesNotExist:
            pass

    progress.completed    = True
    progress.completed_at = timezone.now()
    progress.save()

    # Kurs tugallanishini tekshirish
    total     = enrollment.course.lessons.filter(is_published=True).count()
    completed = enrollment.lesson_progresses.filter(completed=True).count()

    if completed >= total and not enrollment.completed:
        enrollment.completed    = True
        enrollment.completed_at = timezone.now()
        enrollment.save()

        # Sertifikat yaratish (Pro bo'lsa)
        if request.user.is_pro:
            from onolam.apps.certificates.models import Certificate
            Certificate.objects.get_or_create(
                user=request.user, course=lesson.course
            )

        return Response({
            'message':    'Tabriklaymiz! Kursni tugatdingiz! 🎉',
            'completed':  True,
            'progress':   100,
            'certificate': request.user.is_pro,
        })

    return Response({
        'message':  'Dars tugatildi ✓',
        'completed': True,
        'progress':  enrollment.progress_percent,
    })


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_video_progress(request, pk):
    """PATCH /api/v1/courses/lessons/<pk>/progress/ — Video progress saqlash"""
    lesson     = get_object_or_404(Lesson, pk=pk)
    enrollment = get_object_or_404(Enrollment, user=request.user, course=lesson.course)
    progress, _ = LessonProgress.objects.get_or_create(enrollment=enrollment, lesson=lesson)

    watched = request.data.get('watched_seconds', 0)
    progress.video_watched_seconds = max(progress.video_watched_seconds, int(watched))
    progress.save(update_fields=['video_watched_seconds'])

    return Response({'saved': True})


# ── ADMIN VIEWS ──

class AdminLessonCreateView(generics.CreateAPIView):
    """POST /api/v1/courses/admin/lessons/"""
    permission_classes = [permissions.IsAdminUser]

    def create(self, request, *args, **kwargs):
        from .serializers import LessonDetailSerializer
        serializer = LessonDetailSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


class AdminLessonUpdateView(generics.RetrieveUpdateDestroyAPIView):
    """PUT/DELETE /api/v1/courses/admin/lessons/<pk>/"""
    queryset           = Lesson.objects.all()
    permission_classes = [permissions.IsAdminUser]

    def get_serializer_class(self):
        from .serializers import LessonDetailSerializer
        return LessonDetailSerializer
