# Configurar las cuentas (Supabase)

GodChess exige iniciar sesión. Las cuentas, los perfiles, la sincronización y los amigos viven en un proyecto gratuito de Supabase.

## 1. Crear el proyecto
1. Entra en https://supabase.com y crea un proyecto (plan gratuito).
2. **SQL Editor → New query**: pega `supabase/schema.sql` entero y pulsa **Run**.

## 2. Direcciones permitidas
**Authentication → URL Configuration**
- *Site URL*: `https://tomasunab.github.io/GodChess/`
- *Redirect URLs*: añade `https://tomasunab.github.io/GodChess/` y `http://localhost:5174/`

## 3. Métodos de acceso
**Authentication → Sign In / Providers**
- *Email*: viene activado. Si quieres entrar sin confirmar el email, desactiva «Confirm email».
- *Google* y *GitHub* (opcionales): actívalos y pega el Client ID y el Secret de cada uno. La URL de callback que piden es la que muestra Supabase en esa misma pantalla.

## 4. Claves en GodChess
**Project Settings → API**: copia *Project URL* y la clave *anon public* (nunca la *service_role*).
- En local: crea `.env.local` a partir de `.env.example`.
- En GitHub Pages: **Settings → Secrets and variables → Actions** del repositorio, dos secretos: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. El próximo `push` publica la versión con cuentas.

Sin esas claves, la web publicada muestra la landing con el aviso «Las cuentas aún no están configuradas».
