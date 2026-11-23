# DreamSpace 3D 🏠✨ — v2

Apna ghar / building 3D me design karo: rooms, floors, terrace, balcony, garden, 295 furniture designs, 156 paint shades, 24 floor materials, live cost estimate, real AI/ML, aur ek alag "Command Center" admin panel.

**Stack:** Flask + Neon Postgres + Cloudinary + React/Three.js (Vite). Sab kuch **Neon + Cloudinary** me — koi local JSON/SQLite database nahi.

---
## 1. `.env` (tumhare 14 variables bilkul sahi hain — kuch add/remove nahi karna)

`DATABASE_URL, SECRET_KEY, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, MAIL_DEFAULT_SENDER, MAIL_SENDER_NAME, BREVO_API_KEY, ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_PANEL_PASSWORD, ADMIN_SECURITY_QUESTION, ADMIN_SECURITY_ANSWER`

Optional (sirf agar chaaho): `NEON_STORAGE_LIMIT_MB` (default 512, admin storage gauge ke liye).
`.env` ko project **root** me rakho (`.env.example` dekho). Ye file kabhi GitHub pe mat daalo (`.gitignore` already ignore karta hai).

## 2. Local chalana (Windows)
```
dev.bat
```
Ya manually: terminal 1 → `pip install -r requirements.txt` then `python backend/run.py` · terminal 2 → `cd frontend && npm install && npm run dev` → http://localhost:5173
Local aur online **same Neon + Cloudinary** use karte hain, isliye data hamesha sync rehta hai. Database tables/columns **automatically** upgrade ho jaate hain (purane users/projects safe rehte hain) — koi migration command nahi.

## 3. GitHub → Render deploy
1. Naya GitHub repo banao, ye poora folder push karo (`.env`, `node_modules`, `.venv` push NAHI honge).
2. Render → **New + → Blueprint** → repo select (ye `render.yaml` padh lega). Ya "Web Service" banao: Build `./build.sh`, Start `gunicorn --chdir backend run:app --workers 1 --threads 4 --timeout 120 --bind 0.0.0.0:$PORT`.
3. Environment me apne 14 variables paste karo (`FLASK_ENV=production` already set hai).
4. Deploy hone ke baad link friends ko bhejo — phone/tablet/laptop sab pe chalega.

**512 MB ka dhyan:** requirements sirf 9 chhote packages (torch/numpy/sklearn nahi). AI/ML pure-Python hai. 1 gunicorn worker + 4 threads. Build ke baad `node_modules` delete ho jaata hai.
Agar Render par frontend build fail ho (memory), local pe `cd frontend && npm run build` karke `frontend/dist` ko commit kar do (`.gitignore` se `frontend/dist/` hata ke) aur Render me `FORCE_FRONTEND_BUILD=0` set karo.

---
## 4. Kya naya hai (summary)
**User side**
* Neon-glass UI, dark/light toggle (top-right gol button: ☀️ light, 🌙 dark), har page pe scroll + back button, poori screen use hoti hai.
* Login: **email ya username** + password. Ek email se multiple accounts. Login pe OTP tabhi jab 2FA on ho. Signup pe email OTP (10 min valid, 60 s cooldown).
* 5 galat password → account 15 min ke liye lock.
* Forgot password (OTP), Forgot username (email OTP → saare usernames), account settings: password/email change (OTP), 2FA on/off, account delete.
* **Studio:** ek hi 3D canvas pe saare rooms + saari floors ek saath. Rooms/floors add, dimensions (w × l, floor height), drag-move (edges snap), garden/terrace/balcony, 295 items (18 wardrobe, 12 bed, 10 sofa, 10 chair, 10 doors, 10 windows, 6 fans, chandeliers, bathtubs, kitchens, garden items…), har item ka size/colour/height/rotation edit, 156 paint shades (har deewar alag colour), 24 floor materials + tile size, day/evening/night, plan view, walls Full/Half/X-ray, undo/redo, autosave, keyboard shortcuts, thumbnails (Cloudinary), share link (read-only), duplicate project, CSV cost estimate.
* **Live cost:** har item, paint, tile ka ₹ price + construction estimate (Basic/Standard/Premium/Luxury). Admin prices badal sakta hai.
* **AI/ML (real, server pe):** (1) Smart suggestions — PMI co-occurrence recommender, sab users ke saved rooms pe train hota hai; (2) Auto-arrange — simulated annealing layout optimiser; (3) Design review — 10 cm grid + BFS walkability, k-means palette, hue-template colour harmony score. Cold-start ke liye chhota bootstrap prior (weight 0.15) — API batata hai kitne real/prior rooms use hue.

**Admin (login page pe `ADMIN_USERNAME` + `ADMIN_PASSWORD`, ya admin email se)**
1. Gate page — 3 options: *Access Admin Panel*, *Back to login page*, *Forgot password*.
2. Panel password (`ADMIN_PANEL_PASSWORD`) → Dashboard. 5 galat try → 15 min lock. 60 min idle pe auto-lock.
3. Forgot password = security question (`.env`) + admin email OTP → login ya panel password reset.
4. Dashboard: users, last login (IST), signups/logins/projects chart + 7-day ML forecast, most/least/never-used items, popular colours/floors, activity feed.
5. Users: search/filter, block/unblock, delete, projects dekho (3D viewer), per-user backup, login history.
6. Activity log: accounts created/deleted, password/email changes, logins, admin actions — sab IST me.
7. Storage: Neon (size, tables, rows, connections) + Cloudinary (storage, bandwidth, credits, folders) + total app storage.
8. Backups (Cloudinary me private): full app / single user, download, restore (merge), delete. Danger zone: entire app delete (panel password + "DELETE ENTIRE APP" type karna padta hai).
9. Prices editor, admin email/password/panel password change. Unique cursor (glow dot + magnetic ring + particle trail).

**Time:** DB UTC me, API hamesha `+05:30` offset ke saath bhejti hai aur browser `Asia/Kolkata` me format karta hai — 5:30 ghante ka shift possible nahi.

## 5. Tests
`ALLOW_SQLITE=1 python backend/tests/smoke_test.py` (53 checks: signup, OTP, lockout, admin gate, AI, backup…) · `python backend/tests/schema_restore_test.py`.

## 6. Security notes
Argon2 hashes (purane hashes chalte rahenge), CSRF header guard (`X-DS-Client`), HttpOnly+SameSite cookies (+Secure on Render), OTP HMAC-hashed, admin lockouts, input limits (2 MB scene, 30 projects/user).
