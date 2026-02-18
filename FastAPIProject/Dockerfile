FROM python:3.11-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libreoffice-writer fonts-dejavu-core fontconfig \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /usr/share/fonts/truetype/msttcorefonts \
    && if find /app/app/fonts -maxdepth 1 -type f \( -iname "times*.ttf" -o -iname "Times New Roman*.ttf" \) | grep -q .; then \
        find /app/app/fonts -maxdepth 1 -type f \( -iname "times*.ttf" -o -iname "Times New Roman*.ttf" \) -exec cp {} /usr/share/fonts/truetype/msttcorefonts/ \; \
        fc-cache -f -v; \
    fi

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
