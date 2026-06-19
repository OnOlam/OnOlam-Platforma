"""
OnOlam — Base Settings
Barcha muhitlar (dev, prod) uchun umumiy sozlamalar
"""
from pathlib import Path
from datetime import timedelta
from decouple import config

# ── PATHS ──
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ── SECURITY ──
SECRET_KEY = config('SECRET_KEY', default='django-insecure-change-this-in-production')
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1').split(',')

# ── APPS ──
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',  # ← BU QO'SHILISHI KERAK
    'corsheaders',
    'django_filters',
    'django_cleanup.apps.CleanupConfig',
]

LOCAL_APPS = [
    'onolam.apps.accounts',
    'onolam.apps.courses',
    'onolam.apps.payments',
    'onolam.apps.certificates',
    'onolam.apps.ai_chat',
    'onolam.apps.analytics',
    'onolam.apps.community',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ── MIDDLEWARE ──
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # Custom: Analytics kuzatuv
    'onolam.apps.analytics.middleware.VisitorTrackingMiddleware',
]

ROOT_URLCONF = 'onolam.urls'

# ── TEMPLATES ──
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'onolam.wsgi.application'

# ── AUTH USER ──
AUTH_USER_MODEL = 'accounts.User'

# ── PASSWORD VALIDATION ──
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
     'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ── INTERNATIONALIZATION ──
LANGUAGE_CODE = 'uz'
TIME_ZONE = 'Asia/Tashkent'
USE_I18N = True
USE_TZ = True

# ── STATIC & MEDIA ──
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = config('MEDIA_URL', default='/media/')
MEDIA_ROOT = BASE_DIR / config('MEDIA_ROOT', default='media')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── REST FRAMEWORK ──
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
        'login': '10/minute',      # Brute force himoya
    },
}

# ── JWT ──
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(
        minutes=config('JWT_ACCESS_TOKEN_LIFETIME_MINUTES', default=60, cast=int)
    ),
    'REFRESH_TOKEN_LIFETIME': timedelta(
        days=config('JWT_REFRESH_TOKEN_LIFETIME_DAYS', default=30, cast=int)
    ),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
}

# ── CORS ──
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:3000,http://localhost:8080'
).split(',')
CORS_ALLOW_CREDENTIALS = True

# ── EMAIL ──
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='hello@onolam.uz')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
DEFAULT_FROM_EMAIL = f'OnOlam <{EMAIL_HOST_USER}>'

# ── PAYME ──
PAYME_ID   = config('PAYME_ID', default='')
PAYME_KEY  = config('PAYME_KEY', default='')
PAYME_TEST_KEY = config('PAYME_TEST_KEY', default='')
PAYME_URL  = config('PAYME_URL', default='https://checkout.paycom.uz')

# ── CLICK ──
CLICK_MERCHANT_ID = config('CLICK_MERCHANT_ID', default='')
CLICK_SERVICE_ID  = config('CLICK_SERVICE_ID', default='')
CLICK_SECRET_KEY  = config('CLICK_SECRET_KEY', default='')

# ── PRO TARIF NARXLARI ──
PRO_MONTHLY_PRICE = config('PRO_MONTHLY_PRICE', default='9.00')
PRO_YEARLY_PRICE  = config('PRO_YEARLY_PRICE',  default='75.00')

# ── AI CHAT ──
AI_MAX_FREE_QUESTIONS_PER_DAY = 3
AI_MAX_PRO_QUESTIONS_PER_DAY  = 999
