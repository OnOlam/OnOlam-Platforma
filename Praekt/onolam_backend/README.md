# OnOlam Backend — Django REST API

## Texnologiyalar
- **Django 5.0** + **Django REST Framework**
- **JWT** autentifikatsiya (SimpleJWT)
- **PostgreSQL** (production) / **SQLite** (development)
- **Redis** (cache, session)
- **ReportLab** (PDF sertifikat)

---

## Tez ishga tushirish (Termux / Linux)

### 1. O'rnatish
```bash
# Loyihani klonlash
git clone https://github.com/yourusername/onolam-backend.git
cd onolam-backend

# Virtual muhit
python3 -m venv venv
source venv/bin/activate          # Linux/Mac
# venv\Scripts\activate           # Windows

# Kerakli kutubxonalar
pip install -r requirements.txt
```

### 2. Sozlash
```bash
# .env fayl yaratish
cp .env.example .env

# .env faylni tahrirlang:
nano .env
# SECRET_KEY=... (yangi key yarating)
# DEBUG=True
# DB_ENGINE=django.db.backends.sqlite3
```

### 3. Database
```bash
# Migratsiyalar
python manage.py makemigrations
python manage.py migrate

# Superuser (admin) yaratish
python manage.py createsuperuser
# Email: admin@onolam.uz
# Username: admin
# Parol: ...
```

### 4. Ishga tushirish
```bash
python manage.py runserver
# Server: http://127.0.0.1:8000/
```

---

## API Endpointlar

### Auth
| Method | URL | Tavsif |
|--------|-----|--------|
| POST | `/api/v1/auth/register/` | Ro'yxatdan o'tish |
| POST | `/api/v1/auth/login/` | Kirish (JWT token) |
| POST | `/api/v1/auth/logout/` | Chiqish |
| GET/PUT | `/api/v1/auth/profile/` | Profil |
| POST | `/api/v1/auth/token/refresh/` | Token yangilash |

### Kurslar
| Method | URL | Tavsif |
|--------|-----|--------|
| GET | `/api/v1/courses/` | Kurslar ro'yxati |
| GET | `/api/v1/courses/<slug>/` | Kurs tafsiloti |
| POST | `/api/v1/courses/<slug>/enroll/` | Kursga yozilish |
| GET | `/api/v1/courses/lessons/<pk>/` | Dars tafsiloti |
| POST | `/api/v1/courses/lessons/<pk>/complete/` | Darsni tugatish |

### To'lovlar
| Method | URL | Tavsif |
|--------|-----|--------|
| POST | `/api/v1/payments/create/` | To'lov boshlash |
| POST | `/api/v1/payments/verify/` | Kupon tekshirish |
| GET | `/api/v1/payments/history/` | To'lov tarixi |
| POST | `/api/v1/payments/payme/webhook/` | PayMe webhook |
| POST | `/api/v1/payments/click/webhook/` | Click webhook |

### Sertifikatlar
| Method | URL | Tavsif |
|--------|-----|--------|
| GET | `/api/v1/certificates/` | Sertifikatlar |
| GET | `/api/v1/certificates/<id>/pdf/` | PDF yuklash |
| GET | `/api/v1/certificates/verify/<id>/` | Tekshirish |

### AI Chat
| Method | URL | Tavsif |
|--------|-----|--------|
| POST | `/api/v1/ai/chat/` | Savol yuborish |
| GET | `/api/v1/ai/sessions/` | Chat tarixi |

### Analytics (Admin)
| Method | URL | Tavsif |
|--------|-----|--------|
| GET | `/api/v1/analytics/dashboard/` | Umumiy statistika |
| GET | `/api/v1/analytics/visitors/` | Tashrif kuzatuvi |
| GET | `/api/v1/analytics/security/` | Xavfsizlik |
| GET | `/api/v1/analytics/realtime/` | Real vaqt |

---

## Frontend bilan ulash

Frontend (HTML/JS) dan API ga so'rov yuborish:

```javascript
// Login
const response = await fetch('http://127.0.0.1:8000/api/v1/auth/login/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@mail.com', password: '...' })
});
const data = await response.json();
// data.tokens.access — tokenni saqlab qo'ying

// Keyingi so'rovlar uchun token
const courses = await fetch('http://127.0.0.1:8000/api/v1/courses/', {
    headers: { 'Authorization': `Bearer ${data.tokens.access}` }
});
```

---

## Production (server)

```bash
# PostgreSQL o'rnatish
sudo apt install postgresql
createdb onolam_db

# .env da DEBUG=False, DB sozlamalari
# Gunicorn bilan ishga tushirish
gunicorn onolam.wsgi:application --bind 0.0.0.0:8000

# Nginx konfiguratsiya
# /etc/nginx/sites-available/onolam.uz
```

---

## Loyiha tuzilmasi

```
onolam_backend/
├── manage.py
├── requirements.txt
├── .env.example
└── onolam/
    ├── settings/
    │   ├── base.py          # Umumiy sozlamalar
    │   ├── development.py   # Local (SQLite)
    │   └── production.py    # Server (PostgreSQL)
    ├── urls.py              # Asosiy URLlar
    └── apps/
        ├── accounts/        # Foydalanuvchilar, auth, bloklash
        ├── courses/         # Kurslar, darslar, progress
        ├── payments/        # To'lovlar, PayMe, Click, kuponlar
        ├── certificates/    # Sertifikatlar, PDF
        ├── ai_chat/         # AI yordamchi, bilimlar bazasi
        └── analytics/       # Kuzatuv, xavfsizlik, statistika
```
