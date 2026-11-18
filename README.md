# EvalúaQR — Plataforma de evaluación de proyectos finales

**Sitio publicado:** https://evaluaqr.vercel.app · **Guía de configuración y uso:** [GUIA.md](GUIA.md)

Plataforma web para calificar proyectos finales en eventos académicos (ej. *Expodiseño AD2026*) mediante códigos QR.

- **Organizador (maestro):** crea eventos, da de alta proyectos, arma formularios de evaluación y ve el ranking.
- **Evaluador / jurado:** escanea el QR, escribe su nombre y evalúa desde el celular, sin crear cuenta.
- **Herramientas para maestros:** fichas interactivas a partir de PDF, ruleta de sorteos, sopa de letras y crucigrama, guardados en la cuenta y con enlace para estudiantes.

## Tecnología

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, RLS, Storage, Realtime)

## Estado del desarrollo

| Fase | Contenido | Estado |
| --- | --- | --- |
| 1 | Registro/inicio de sesión del organizador, eventos, proyectos, categorías, CSV, co-organizadores, duplicar | ✅ |
| 2 | Constructor de formularios con drag & drop, 19 tipos de campo, puntos, ponderación, lógica condicional, plantillas, importar/exportar preguntas en CSV y vista previa móvil | ✅ |
| 3 | QR general y por proyecto (PNG/SVG), hoja PDF carta, PIN, vista del evaluador en celular con guardado automático | ✅ |
| 4 | Ranking en vivo (general, por categoría y por semestre), podio, empates, respuestas individuales, pantalla de premiación y exportación a Excel, CSV y PDF | ✅ |
| 5 | Herramientas para maestros: ruleta, sopa de letras y crucigrama (guardar, imprimir, compartir) | ✅ |
| 6 | Fichas interactivas desde PDF: 16 tipos de elementos, calificación automática y respuestas de alumnos | ✅ |
| Aula 1 | Roles docente/estudiante, grupos (crear, editar, archivar), invitación por enlace/código/QR, importación de alumnos por CSV con vista previa y reporte de errores, panel del estudiante | ✅ |
| Mi perfil | Foto, datos de contacto; visibles solo entre docente y sus estudiantes | ✅ |
| Aula 2 | Asistencia con QR dinámico (código cada 30 s), ubicación opcional con radio, tolerancia, edición manual con historial, justificantes con archivo privado, CSV | ✅ |
| Aula 3–5 | Actividades y tareas · calificaciones y reportes · notificaciones y calendario | ⏳ |

## Desarrollo local

```bash
cp .env.example .env.local   # y llena las claves de Supabase
npm install
npm run dev
```

La base de datos se define en `supabase/migrations/` (aplicar en orden).
