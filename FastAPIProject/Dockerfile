FROM python:3.11-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libreoffice-writer fonts-dejavu-core fontconfig \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /usr/share/fonts/truetype/msttcorefonts \
    && if [ -d "/app/fonts" ]; then \
        cp /app/fonts/*.ttf /usr/share/fonts/truetype/msttcorefonts/ 2>/dev/null || true; \
        fc-cache -f -v; \
    fi

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
