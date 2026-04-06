"""
OnOlam — Courses Serializers
"""
from rest_framework import serializers
from .models import Course, Lesson, Category, Enrollment, LessonProgress, Quiz, QuizOption


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model  = Category
        fields = ['id', 'name', 'slug', 'icon', 'order']


class LessonListSerializer(serializers.ModelSerializer):
    """Dars ro'yxati (qisqa)"""
    is_accessible = serializers.SerializerMethodField()
    is_completed  = serializers.SerializerMethodField()

    class Meta:
        model  = Lesson
        fields = [
            'id', 'title', 'order', 'lesson_type', 'access_type',
            'duration_minutes', 'is_published', 'is_accessible', 'is_completed',
        ]

    def get_is_accessible(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return obj.access_type == 'free'
        return obj.access_type == 'free' or request.user.is_pro

    def get_is_completed(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return LessonProgress.objects.filter(
                enrollment__user=request.user,
                lesson=obj,
                completed=True
            ).exists()
        return False


class LessonDetailSerializer(serializers.ModelSerializer):
    """Dars to'liq ma'lumoti"""
    is_accessible = serializers.SerializerMethodField()
    is_completed  = serializers.SerializerMethodField()
    quiz          = serializers.SerializerMethodField()
    course_id     = serializers.ReadOnlyField(source='course.id')
    course_slug   = serializers.ReadOnlyField(source='course.slug')
    course_title  = serializers.ReadOnlyField(source='course.title')

    class Meta:
        model  = Lesson
        fields = [
            'id', 'title', 'order', 'lesson_type', 'access_type',
            'content', 'duration_minutes',
            'video_file', 'video_duration', 'video_thumbnail',
            'is_published', 'is_accessible', 'is_completed', 'quiz',
            'course_id', 'course_slug', 'course_title',
        ]

    def get_is_accessible(self, obj):
        request = self.context.get('request')
        if obj.access_type == 'free':
            return True
        if request and request.user.is_authenticated:
            return request.user.is_pro
        return False

    def get_is_completed(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return LessonProgress.objects.filter(
                enrollment__user=request.user,
                lesson=obj,
                completed=True
            ).exists()
        return False

    def get_quiz(self, obj):
        if hasattr(obj, 'quiz'):
            return {
                'question': obj.quiz.question,
                'options': [
                    {'id': opt.id, 'text': opt.text}
                    for opt in obj.quiz.options.all()
                ]
            }
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not data.get('is_accessible'):
            data['content']    = None
            data['video_file'] = None
        return data


class CourseListSerializer(serializers.ModelSerializer):
    """Kurslar ro'yxati"""
    category       = CategorySerializer(read_only=True)
    lesson_count   = serializers.ReadOnlyField()
    enrolled_count = serializers.ReadOnlyField()
    is_enrolled    = serializers.SerializerMethodField()
    progress       = serializers.SerializerMethodField()

    class Meta:
        model  = Course
        fields = [
            'id', 'title', 'slug', 'short_desc', 'icon', 'thumbnail',
            'category', 'access_type', 'difficulty',
            'duration_hours', 'lesson_count', 'enrolled_count',
            'is_enrolled', 'progress', 'is_published',
        ]

    def get_is_enrolled(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.enrollments.filter(user=request.user).exists()
        return False

    def get_progress(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            enrollment = obj.enrollments.filter(user=request.user).first()
            if enrollment:
                return enrollment.progress_percent
        return 0


class CourseDetailSerializer(CourseListSerializer):
    """Kurs to'liq ma'lumoti"""
    lessons   = LessonListSerializer(many=True, read_only=True)
    tags_list = serializers.SerializerMethodField()

    class Meta(CourseListSerializer.Meta):
        fields = CourseListSerializer.Meta.fields + [
            'description', 'lessons', 'tags', 'tags_list', 'language'
        ]

    def get_tags_list(self, obj):
        return [t.strip() for t in obj.tags.split(',') if t.strip()]
