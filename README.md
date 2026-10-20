# Frontend

Interfaz web de Casa Ordenada basada en Next.js y App Router.

## Desarrollo

```sh
npm install
npm run dev
```

## Producción

La forma recomendada es construir la imagen desde el `docker-compose.yml` del
repositorio general. `PUBLIC_API_URL` se incorpora durante el build y debe ser
una URL accesible por el navegador:

```sh
docker compose --env-file .env -f docker-compose.yml build frontend
docker compose --env-file .env -f docker-compose.yml up -d frontend
```

Si cambia la URL pública de la API, hay que reconstruir la imagen.
