# ---------- Stage 1 : builder ----------
FROM composer:2 AS builder

# Work inside Laravel root
WORKDIR /app

# Install Node and npm (for Vite)
RUN apk add --no-cache nodejs npm

# Copy everything from project root
COPY . .

# Install PHP dependencies and Node modules
RUN composer install --no-dev --optimize-autoloader
RUN npm ci

# Build front‑end assets using Laravel‑Vite configuration
RUN test -f vite.config.js && npm run build || echo "No vite.config.js – skipping Vite build"

# ---------- Stage 2 : production runtime ----------
FROM dunglas/frankenphp
WORKDIR /app

# Install needed PHP extensions and system packages
RUN apt-get update && \
    apt-get install -y libpq-dev libpq5 && \
    docker-php-ext-install pdo pdo_pgsql pcntl && \
    apt-get purge -y --auto-remove libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Copy built application from builder
COPY --from=builder /app ./

# Correct permissions for cache, logs, etc.
RUN chown -R www-data:www-data storage bootstrap/cache && \
    chmod -R ug+rw storage bootstrap/cache

# Use production PHP configuration
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

# Optimise & cache Laravel configuration
RUN php artisan optimize
