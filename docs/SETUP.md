# Frontend setup

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
