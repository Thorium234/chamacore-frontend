# Frontend setup
# https://github.com/Thorium234/chamacore-frontend
~/Desktop/programming/frontend/chamacore-frontend
cp .env.example .env.local
# NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

npm install
npm run dev

## Backend (required)

```bash
# https://github.com/Thorium234/Chamacore
C:\Users\user\Desktop\programming\pybased
python -m venv env && source env/bin/activate
cd chamacore
pip install -r requirements.txt
alembic upgrade head
# CHAMACORE_CORS_ORIGINS=http://localhost:3000
uvicorn app.main:app --reload --port 8000
```
Env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
#Never put backend secrets in frontend env.

