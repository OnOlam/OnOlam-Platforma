from django.contrib import admin
from .models import Category, Course, Lesson, Quiz, QuizOption, Enrollment, LessonProgress


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display  = ['name', 'slug', 'icon', 'order']
    prepopulated_fields = {'slug': ('name',)}


class LessonInline(admin.TabularInline):
    model  = Lesson
    fields = ['order', 'title', 'lesson_type', 'access_type', 'duration_minutes', 'is_published']
    extra  = 0


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display  = ['title', 'category', 'access_type', 'difficulty', 'lesson_count', 'enrolled_count', 'is_published']
    list_filter   = ['access_type', 'difficulty', 'is_published', 'category']
    search_fields = ['title', 'description']
    prepopulated_fields = {'slug': ('title',)}
    inlines = [LessonInline]

    @admin.display(description='Darslar')
    def lesson_count(self, obj):
        return obj.lesson_count

    @admin.display(description='O\'quvchilar')
    def enrolled_count(self, obj):
        return obj.enrolled_count


class QuizOptionInline(admin.TabularInline):
    model = QuizOption
    extra = 4


class QuizInline(admin.StackedInline):
    model  = Quiz
    extra  = 0
    inlines = [QuizOptionInline]


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display  = ['title', 'course', 'order', 'lesson_type', 'access_type', 'duration_minutes', 'is_published']
    list_filter   = ['lesson_type', 'access_type', 'is_published', 'course']
    search_fields = ['title', 'content']
    ordering      = ['course', 'order']


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display  = ['user', 'course', 'progress_percent', 'completed', 'enrolled_at']
    list_filter   = ['completed', 'course']
    search_fields = ['user__email', 'course__title']

    @admin.display(description='Progress')
    def progress_percent(self, obj):
        return f'{obj.progress_percent}%'
