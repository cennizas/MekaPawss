# MekaPawss

Sitio estático para el proyecto escolar **MekaPaws**, del Colegio Orlando Fals Borda IED (Proyectos EMI 2026). La página está hecha con HTML5, CSS3 y JavaScript vanilla, sin compilación. El chatbot puede funcionar como guía local o conectarse, mediante un Worker opcional, a OpenAI o Anthropic.

## Estructura

```text
index.html
styles.css
script.js
worker.js
wrangler.jsonc
README.md
PENDIENTES.md
.gitignore
assets/
  logo-mekapaws.png
  articulo-mekapaws.pdf
  cartilla-mekapaws.pdf
  img/
    meka-sprites.png
    game/
      idle-1.png … idle-2.png
      run-1.png … run-4.png
      jump-1.png … jump-2.png
      defeat-1.png … defeat-2.png
    prototipo-isometrico.webp
    prototipo-suela.webp
    taller-equipo.webp
```

## Previsualizar localmente

Abre una terminal en esta carpeta y ejecuta:

```bash
python -m http.server 8000
```

Visita <http://localhost:8000>. También puedes abrir `index.html` directamente, aunque el servidor local se parece más al despliegue final. No se instalan dependencias.

## Publicar en GitHub Pages

1. Crea un repositorio en GitHub y sube el contenido de esta carpeta, con `index.html` en la raíz.
2. En GitHub, ve a **Settings → Pages → Build and deployment**.
3. Selecciona **Deploy from a branch**, la rama `main` y la carpeta `/ (root)`.
4. Cuando tengas la URL pública, reemplaza `https://USUARIO.github.io/mekapaws/` en canonical, Open Graph, Twitter Card y datos estructurados al inicio de `index.html`. No se asigna una URL de publicación hasta conocer el usuario y el repositorio reales.

## Funciones incluidas

- Navegación fija con anclas, menú móvil, scroll suave, resaltado de sección y foco visible.
- Paneles temáticos con navegación propia, enlaces profundos y compatibilidad con atrás/adelante del navegador; diseño adaptable a 320, 480, 768, 1024 y 1440 px.
- Selector ES/EN y modo claro/oscuro, con preferencia guardada en `localStorage`.
- Visor de Sketchfab, mapa y formulario de Google cargados solo después de pulsar sus botones. Así no se solicitan esos servicios externos al abrir la página.
- Minijuego con paisaje de atardecer, mar oscuro y diez sprites aportados para Meka: dos poses idle, cuatro de carrera, dos de salto y dos de derrota. Cada pose se carga como archivo PNG propio. Se juega con Espacio, flecha arriba o el botón **Saltar**.
- Chatbot bilingüe que acepta preguntas generales. Sin endpoint configurado, responde con una guía local limitada; al desplegar el Worker usa OpenAI o Anthropic y mantiene la conversación solo en memoria del navegador.
- Enlaces a WhatsApp, correo, artículo y cartilla del proyecto.
- Animaciones de aparición que respetan `prefers-reduced-motion`.

## Datos configurados

- Punto de contacto: **Calle 71 D Sur #14-16, Usme, Bogotá**. El botón de mapa abre Google Maps con esa dirección.
- WhatsApp: **+57 304 590 1916**.
- Correo: **ashescatto@gmail.com**.
- Formulario: Google Forms; revisa que incluya nombre del tutor, ciudad, especie, tipo de amputación, teléfono/WhatsApp, correo y mensaje. Su contenido se administra desde la cuenta propietaria del formulario.
- Modelo 3D: Sketchfab, modelo **«prótesis»** de **cennizas**, con atribución CC BY 4.0.

## Conectar el chatbot a IA

La conexión está preparada, pero no se activa hasta tener una clave de API y desplegar el Worker. La clave se guarda en Cloudflare como secret y nunca en `index.html` o `script.js`.

1. `wrangler.jsonc` viene configurado con OpenAI y `gpt-5-mini`; revisa que `SITE_ORIGINS` tenga el origen público exacto del sitio y conserva `http://localhost:8000` para desarrollo. Si eliges Anthropic, cambia también proveedor y modelo por uno disponible en esa cuenta.
2. En esta carpeta, guarda la clave del proveedor en Cloudflare: `npx wrangler secret put OPENAI_API_KEY` o `npx wrangler secret put ANTHROPIC_API_KEY`.
3. Despliega el endpoint con `npx wrangler deploy`. El Worker limita las solicitudes a 20 por minuto por IP y restringe CORS a `SITE_ORIGINS`.
4. Copia la URL publicada del Worker y pégala en `<meta name="mekapaws-ai-endpoint" content=".../api/chat">` dentro de `index.html`.

Mientras el contenido de esa etiqueta esté vacío, el chatbot indica que la IA no está conectada y usa solo las respuestas locales de preguntas frecuentes. La API requiere una cuenta y una clave propias del proveedor; la suscripción de ChatGPT o Claude no se utiliza como credencial de API. El uso de la API puede generar cobros según la cuenta y el proveedor.

## Privacidad y límites

La página no instala cookies propias ni integra analytics o rastreadores. El Worker no guarda conversaciones y OpenAI recibe la opción `store: false`; cuando se habilita la IA, los mensajes se envían al proveedor elegido y aplican sus políticas de datos. Sin endpoint, las respuestas del chatbot se generan en el navegador. Google Forms, Google Maps y Sketchfab son servicios externos y solo se cargan cuando una persona lo solicita; al usarlos aplican sus propias políticas. Los precios y cifras financieras no se publican. Las actividades futuras están descritas como propuestas o proyecciones del proyecto. El sitio no afirma certificaciones ISO ni aprobación del INVIMA.

## Pendientes editoriales

Consulta [PENDIENTES.md](PENDIENTES.md) para la lista de recursos provisionales y datos que conviene confirmar antes de publicar. No se incluye foto del equipo.

No se ejecutó una auditoría Lighthouse durante esta edición; el objetivo de puntuación debe comprobarse en la URL publicada.
