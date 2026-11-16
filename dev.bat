@echo off
REM Local development (Windows): opens backend (Flask :5000) and frontend (Vite :5173) in two windows.
REM Uses the SAME Neon + Cloudinary as production because .env is shared -> everything stays in sync.
if not exist .venv ( python -m venv .venv )
call .venv\Scripts\activate
pip install -r requirements.txt
start "DreamSpace backend" cmd /k "call .venv\Scripts\activate && python backend\run.py"
cd frontend
if not exist node_modules ( npm install )
start "DreamSpace frontend" cmd /k "npm run dev"
echo Open http://localhost:5173
