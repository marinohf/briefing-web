# INTEL — puesta en marcha (≈10 minutos, sin coste)

Qué hace: cada día busca noticias, cada lunes escribe el briefing semanal, y al cerrar mes, trimestre y año redacta el resumen. La web (`index.html`) lo lee de `data/db.json`.

1. Crea una cuenta en github.com y un repositorio **público** nuevo (Pages es gratis solo en públicos).
2. Sube el contenido de esta carpeta (incluida `.github`) con "Add file → Upload files".
3. Consigue una clave gratuita en https://aistudio.google.com/apikey y guárdala en el repo: Settings → Secrets and variables → Actions → New repository secret, nombre `GEMINI_API_KEY`.
4. Settings → Pages → Source: "Deploy from a branch", rama `main`, carpeta `/ (root)`.
5. Pestaña Actions → "Actualizar inteligencia" → Run workflow → `daily`, para probar. Al terminar, tu web está en `https://TU_USUARIO.github.io/NOMBRE_DEL_REPO/`.

Notas
- Se publica solo, sin revisión. Si un día la IA devuelve algo con formato inválido, el job falla y no se publica nada (GitHub te avisa por email).
- Los límites de la capa gratuita de Gemini y de su búsqueda web cambian: compruébalos en Google AI Studio. Modelo por defecto `gemini-2.5-flash`; cámbialo con la variable `GEMINI_MODEL` si hace falta.
- Probar en local sin clave: `node scripts/test.mjs`.
