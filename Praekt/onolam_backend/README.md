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
