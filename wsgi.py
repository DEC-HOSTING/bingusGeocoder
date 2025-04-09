# wsgi.py
from app import app

# Vercel will likely find 'app', but 'application' is also common
application = app