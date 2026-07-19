FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY packages packages/
COPY apps/api apps/api/

RUN pip install -e packages/domain -e packages/config -e packages/synthetic-data -e apps/api

EXPOSE 8000

CMD ["uvicorn", "kavach_api.main:app", "--host", "0.0.0.0", "--port", "8000", "--app-dir", "apps/api"]
