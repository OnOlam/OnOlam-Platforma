"""
OnOlam — Courses Models
Kurs, dars, progress, quiz
"""
from django.db import models
from django.conf import settings


class Category(models.Model):
    """Kurs kategoriyalari: Frontend, Backend, Terminal..."""
    name       = models.CharField(max_length=50, verbose_name='Nomi')
    slug       = models.SlugField(unique=True)
    icon       = models.CharField(max_length=10, default='📚', verbose_name='Emoji')
    order      = models.PositiveIntegerField(default=0, verbose_name='Tartib')

    class Meta:
        verbose_name        = 'Kategoriya'
        verbose_name_plural = 'Kategoriyalar'
        ordering = ['order']

    def __str__(self):
        return self.name


class Course(models.Model):
    """Kurs modeli"""

    class DifficultyLevel(models.TextChoices):
        BEGINNER     = 'beginner',     'Boshlang\'ich'
        INTERMEDIATE = 'intermediate', 'O\'rta'
        ADVANCED     = 'advanced',     'Yuqori'

    class AccessType(models.TextChoices):
        FREE = 'free', 'Bepul'
        PRO  = 'pro',  'Pro'

    # ── ASOSIY ──
    title       = models.CharField(max_length=200, verbose_name='Sarlavha')
    slug        = models.SlugField(unique=True)
    description = models.TextField(verbose_name='Tavsif')
    short_desc  = models.CharField(max_length=300, verbose_name='Qisqa tavsif')
    icon        = models.CharField(max_length=10, default='📚')
    thumbnail   = models.ImageField(
        upload_to='courses/thumbnails/',
        blank=True, null=True
    )

    # ── KATEGORIYA ──
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL,
        null=True, related_name='courses'
    )

    # ── KIRISH ──
    access_type = models.CharField(
        max_length=10,
        choices=AccessType.choices,
        default=AccessType.FREE
    )
    difficulty = models.CharField(
        max_length=15,
        choices=DifficultyLevel.choices,
        default=DifficultyLevel.BEGINNER
    )

    # ── META ──
    duration_hours = models.PositiveIntegerField(default=0, verbose_name='Davomiylik (soat)')
    language       = models.CharField(max_length=10, default='uz', verbose_name='Til')
    tags           = models.CharField(max_length=300, blank=True, verbose_name='Teglar')

    # ── HOLAT ──
    is_published   = models.BooleanField(default=False, verbose_name='Nashr etilgan')
    is_coming_soon = models.BooleanField(default=False, verbose_name='Tez kunda')

    # ── SANA ──
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = 'Kurs'
        verbose_name_plural = 'Kurslar'
        ordering = ['category', 'title']

    def __str__(self):
        return self.title

    @property
    def lesson_count(self):
        return self.lessons.filter(is_published=True).count()

    @property
    def enrolled_count(self):
        return self.enrollments.count()


class Lesson(models.Model):
    """Dars modeli"""

    class LessonType(models.TextChoices):
        TEXT        = 'text',        'Matn'
        VIDEO       = 'video',       'Video'
        TEXT_VIDEO  = 'text_video',  'Matn + Video'
        INTERACTIVE = 'interactive', 'Interaktiv'

    class AccessType(models.TextChoices):
        FREE = 'free', 'Bepul'
        PRO  = 'pro',  'Pro'

    # ── ASOSIY ──
    course      = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='lessons')
    title       = models.CharField(max_length=200, verbose_name='Sarlavha')
    order       = models.PositiveIntegerField(default=1, verbose_name='Tartib')
    lesson_type = models.CharField(max_length=15, choices=LessonType.choices, default=LessonType.TEXT)
    access_type = models.CharField(max_length=10, choices=AccessType.choices, default=AccessType.FREE)

    # ── KONTENT ──
    content     = models.TextField(blank=True, verbose_name='Matn kontent (HTML)')
    duration_minutes = models.PositiveIntegerField(default=10, verbose_name='Davomiylik (daq)')

    # ── VIDEO ──
    video_file = models.FileField(
        upload_to='lessons/videos/%Y/%m/',
        blank=True, null=True,
        verbose_name='Video fayl'
    )
    video_duration = models.PositiveIntegerField(
        default=0,
        verbose_name='Video davomiylik (soniya)'
    )
    video_thumbnail = models.ImageField(
        upload_to='lessons/thumbnails/',
        blank=True, null=True
    )

    # ── META ──
    is_published = models.BooleanField(default=True, verbose_name='Nashr etilgan')
    meta_title   = models.CharField(max_length=200, blank=True)
    meta_desc    = models.TextField(blank=True)
    tags         = models.CharField(max_length=300, blank=True)

    # ── AI ──
    ai_content   = models.TextField(
        blank=True,
        verbose_name='AI uchun mazmun (admin tomonidan kiritiladi)'
    )

    # ── SANA ──
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = 'Dars'
        verbose_name_plural = 'Darslar'
        ordering = ['course', 'order']
        unique_together = ['course', 'order']

    def __str__(self):
        return f'{self.course.title} — {self.order}. {self.title}'


class Quiz(models.Model):
    """Dars quizi"""
    lesson   = models.OneToOneField(Lesson, on_delete=models.CASCADE, related_name='quiz')
    question = models.TextField(verbose_name='Savol')

    class Meta:
        verbose_name        = 'Quiz'
        verbose_name_plural = 'Quizlar'

    def __str__(self):
        return f'Quiz: {self.lesson.title}'


class QuizOption(models.Model):
    """Quiz variantlari"""
    quiz       = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='options')
    text       = models.CharField(max_length=300, verbose_name='Variant matni')
    is_correct = models.BooleanField(default=False, verbose_name='To\'g\'ri javob')
    order      = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f'{"✓" if self.is_correct else "✗"} {self.text[:50]}'


class Enrollment(models.Model):
    """Foydalanuvchi kursga yozilishi"""
    user    = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='enrollments')
    course  = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='enrollments')
    enrolled_at = models.DateTimeField(auto_now_add=True)
    completed   = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name        = 'Yozilish'
        verbose_name_plural = 'Yozilishlar'
        unique_together = ['user', 'course']

    def __str__(self):
        return f'{self.user} → {self.course}'

    @property
    def progress_percent(self):
        """Kurs progressi foizda"""
        total     = self.course.lessons.filter(is_published=True).count()
        completed = self.lesson_progresses.filter(completed=True).count()
        if total == 0:
            return 0
        return int((completed / total) * 100)


class LessonProgress(models.Model):
    """Foydalanuvchi dars progressi"""
    enrollment = models.ForeignKey(
        Enrollment, on_delete=models.CASCADE,
        related_name='lesson_progresses'
    )
    lesson     = models.ForeignKey(Lesson, on_delete=models.CASCADE)
    completed  = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    # Video progress
    video_watched_seconds = models.PositiveIntegerField(default=0)

    # Quiz natijasi
    quiz_passed  = models.BooleanField(default=False)
    quiz_answer  = models.ForeignKey(
        QuizOption, on_delete=models.SET_NULL,
        null=True, blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['enrollment', 'lesson']

    def __str__(self):
        status = '✓' if self.completed else '○'
        return f'{status} {self.enrollment.user} — {self.lesson}'
