FROM nginxinc/nginx-unprivileged:1.27.2-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/esprittech-frontend/browser /usr/share/nginx/html

USER 101
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/health || exit 1
