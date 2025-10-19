# ---------- Stage 1 : builder ----------
FROM composer:2 AS builder
WORKDIR /app
RUN apk add --no-cache nodejs npm
COPY . .
RUN composer install --no-dev --optimize-autoloader
RUN npm ci && npm run build

# ---------- Stage 2 : runtime ----------
FROM dunglas/frankenphp
WORKDIR /app
RUN apt-get update && \
    apt-get install -y libpq-dev libpq5 && \
    docker-php-ext-install pdo pdo_pgsql pcntl && \
    apt-get purge -y --auto-remove libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /app ./
# 👇 copy just the built assets explicitly
COPY --from=builder /app/public/build ./public/build

RUN chown -R www-data:www-data storage bootstrap/cache && \
    chmod -R ug+rw storage bootstrap/cache
RUN php artisan optimize

CMD ["php", "artisan", "octane:frankenphp", "--host=0.0.0.0", "--port=8000", "--workers=auto", "--max-requests=500"]
