"""
OnOlam — Development Settings
Local ishlab chiqish uchun sozlamalar
"""
from .base import *

DEBUG = True

# ── SQLite (local uchun oson) ──
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# ── EMAIL — Konsolga chiqaradi (real yuborish yo'q) ──
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# ── DEBUG TOOLBAR ──
# debug_toolbar o'chirildi
# INSTALLED_APPS += ['debug_toolbar']
# MIDDLEWARE = ['debug_toolbar.middleware.DebugToolbarMiddleware'] + MIDDLEWARE
# INTERNAL_IPS = ['127.0.0.1']

# ── CORS — Development da hamma joydan ruxsat ──
CORS_ALLOW_ALL_ORIGINS = True

# ── MEDIA ──
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ── LOGGING ──
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'formatters': {
        'verbose': {
            'format': '[{levelname}] {asctime} {module}: {message}',
            'style': '{',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'DEBUG',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'onolam': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
ALLOWED_HOSTS = ['*']
