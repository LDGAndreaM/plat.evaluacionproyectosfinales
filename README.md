# EvalúaQR — Plataforma de evaluación de proyectos finales

Plataforma web para calificar proyectos finales en eventos académicos (ej. *Expodiseño AD2026*) mediante códigos QR.

- **Organizador (maestro):** crea eventos, da de alta proyectos, arma formularios de evaluación y ve el ranking.
- **Evaluador / jurado:** escanea el QR, escribe su nombre y evalúa desde el celular, sin crear cuenta.

## Tecnología

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, RLS, Storage, Realtime)

## Estado del desarrollo

| Fase | Contenido | Estado |
| --- | --- | --- |
| 1 | Registro/inicio de sesión del organizador, eventos, proyectos, categorías, CSV, co-organizadores, duplicar | ✅ |
| 2 | Constructor de formularios con drag & drop, 19 tipos de campo, puntos, ponderación, lógica condicional, plantillas y vista previa móvil | ✅ |
| 3 | Códigos QR y vista del evaluador en móvil | ⏳ |
| 4 | Puntajes, ranking, podio, pantalla de premiación y exportación | ⏳ |

## Desarrollo local

```bash
cp .env.example .env.local   # y llena las claves de Supabase
npm install
npm run dev
```

La base de datos se define en `supabase/migrations/` (aplicar en orden).
