# ONE v18 · ONE Mail

## 1. Base de datos
En Supabase > SQL Editor ejecuta completo:

`supabase/migrations/20260826_one_mail_v18.sql`

## 2. Clave de cifrado
ONE Mail necesita una clave propia y estable. En tu Mac genera una:

```bash
openssl rand -hex 32
```

Añádela a `.env.local`:

```env
ONE_MAIL_ENCRYPTION_KEY=LA_CLAVE_GENERADA
```

Y añade exactamente la misma variable `ONE_MAIL_ENCRYPTION_KEY` en Vercel para Production.

No cambies esta clave después de conectar buzones: se usa para cifrar/descifrar sus credenciales.

## 3. Probar en local

```bash
npm run dev
```

En ONE entra en `Correo > Configurar`, selecciona Arsys, indica el correo y la contraseña real del buzón y pulsa `Conectar y verificar`.

Arsys queda precargado así:
- SMTP: smtp.arsys.es : 465 SSL/TLS
- IMAP: mail.arsys.es : 993 SSL/TLS

Después prueba:
1. Bandeja de entrada.
2. Abrir un correo.
3. Responder dentro de ONE.
4. Cliente 360 > Email.
5. Enviados.

## 4. Publicar
Cuando local funcione:

```bash
npm run build
npm run cloud
```
