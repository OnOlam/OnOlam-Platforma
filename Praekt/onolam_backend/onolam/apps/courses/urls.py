"""OnOlam — Courses URL patterns"""
from django.urls import path
from . import views

urlpatterns = [
    # ── KURSLAR ──
    path('',                           views.CourseListView.as_view(),    name='course-list'),
    path('<slug:slug>/',               views.CourseDetailView.as_view(),  name='course-detail'),
    path('<slug:slug>/enroll/',        views.enroll_course,               name='course-enroll'),
    path('<slug:slug>/lessons/',       views.CourseLessonsView.as_view(), name='course-lessons'),

    # ── DARSLAR ──
    path('lessons/<int:pk>/',          views.LessonDetailView.as_view(),  name='lesson-detail'),
    path('lessons/<int:pk>/complete/', views.complete_lesson,             name='lesson-complete'),
    path('lessons/<int:pk>/progress/', views.update_video_progress,       name='lesson-video-progress'),

    # ── KATEGORIYALAR ──
    path('categories/',                views.CategoryListView.as_view(),  name='category-list'),

    # ── ADMIN ──
    path('admin/lessons/',             views.AdminLessonCreateView.as_view(), name='admin-lesson-create'),
    path('admin/lessons/<int:pk>/',    views.AdminLessonUpdateView.as_view(), name='admin-lesson-update'),
]
