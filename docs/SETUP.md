```bash
# Frontend setup
# https://github.com/Thorium234/chamacore-frontend
~/Desktop/programming/frontend/chamacore-frontend
cp .env.example .env.local
# NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# 1. Install all project dependencies listed in package.json
# Run this first when setting up the project or after pulling new changes
npm install

# 2. Start the local development server with hot-reloading
# Run this while actively writing and testing code (not for production)
npm run dev

# 3. Create an optimized production build
# Run this once to compile your application and check for build errors before deploying
npm run build

# 4. Start the production server
# Run this on your server after building to serve the production application
npm run start
```

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

