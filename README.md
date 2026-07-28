# AN24 ONE v2

CRM integral para AN24, construido con Next.js 16 y TypeScript.

## Probar localmente

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`. La pantalla de acceso funciona en modo demostración y entra al dashboard sin credenciales reales.

## Incluido

Dashboard, clientes, ficha 360º, agenda, pipeline, productos, comerciales, servicios, documentos, informes, configuración y esquema SQL para Supabase.

## Conectar Supabase

1. Copia `.env.example` como `.env.local`.
2. Añade URL y clave pública de Supabase.
3. Ejecuta `supabase/schema.sql` en el SQL Editor.
4. Sustituye los datos de demostración por consultas desde Supabase.
