from app import create_app

app = create_app()

if __name__ == "__main__":
    # Vite (npm run dev) proxies /api to this port. Same Neon DB + Cloudinary as production.
    app.run(host="127.0.0.1", port=5000, debug=True)
