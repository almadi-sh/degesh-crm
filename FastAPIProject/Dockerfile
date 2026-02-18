FROM python:3.11-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libreoffice-writer \
        fontconfig \
        fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Copy custom fonts (Times New Roman etc.) into system fonts
RUN mkdir -p /usr/share/fonts/truetype/custom \
    && if [ -d "/app/app/fonts" ]; then \
        cp /app/app/fonts/*.ttf /usr/share/fonts/truetype/custom/ 2>/dev/null || true; \
        fc-cache -f -v; \
    fi

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
