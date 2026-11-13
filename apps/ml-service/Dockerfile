# syntax=docker/dockerfile:1
# AMX-ERP-2026 ML service:  docker build -t amdox-erp-suite/ml-service:0.2.0 apps/ml-service
FROM python:3.11.10-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

# Non-root user; Prophet (cmdstan) needs a writable temp dir
RUN useradd --system --uid 1001 --create-home app
COPY --chown=app:app main.py .
USER app
ENV TMPDIR=/tmp

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=3s --start-period=30s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2).status == 200 else 1)"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
