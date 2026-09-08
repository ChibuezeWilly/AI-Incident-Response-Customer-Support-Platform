FROM python:3.12-slim

WORKDIR /app

# The web service should not spawn a second memory-heavy worker process.
ENV ARQ_AUTOSTART_WORKER=false

COPY requirements.txt ./requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

COPY . ./app

EXPOSE 10000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
