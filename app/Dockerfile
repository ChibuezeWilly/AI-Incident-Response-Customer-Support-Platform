FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt ./requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

COPY . ./app

EXPOSE 10000

# Render supplies PORT at runtime; 10000 is the production fallback.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
