# Auditoría integral de calidad — Saldantia

Fecha: 18 de agosto de 2026.

## Resultado

- `index.html` carga, en orden, `base.css`, `hero.css`, `servicios.css` y `secciones.css`, y carga `scroll.js` con `defer`.
- Las 101 clases presentes en el HTML tienen una regla propia, una regla estructural aplicable o forman parte de un componente compuesto. Los estados que no están en el HTML inicial (`reveal--visible`, `nav--open`, `nav--scrolled` y `nav__link--activo`) los añade JavaScript y están cubiertos por CSS. Las utilidades genéricas no usadas de `base.css` se conservan deliberadamente como parte del sistema de diseño; no son componentes huérfanos.
- `img/hero-bg.jpg` existe (1376 × 768, JPEG), se resuelve desde `hero.css` y es decorativa, por lo que no necesita `alt`. La referencia Open Graph inexistente fue sustituida por esta imagen y ahora incluye texto alternativo social.
- Se verificó el render con Chrome en 1024, 768 y 480 px: no hay desbordamiento horizontal; servicios pasa de 4 a 2 y 1 columna; casos, proceso, formulario y footer se apilan en sus cortes; la navegación permanece completa a 768 px y se convierte en menú móvil por debajo de ese ancho.
- Los siete controles del formulario tienen un `label[for]` válido. El enlace de salto ahora apunta al `main`, que puede recibir foco. Los SVG decorativos están ocultos del árbol accesible.
- El texto normal mantiene al menos 4.5:1 sobre las superficies usadas. Se elevó el contraste de `--text-faint` y se creó `--accent-text` para texto rojo pequeño sin alterar el rojo de botones y superficies.
- `.reveal` y `.reveal--visible` están coordinadas entre CSS y JavaScript. Se comprobó en navegador que los elementos observados pasan a opacidad 1 al entrar en viewport, y que la preferencia de movimiento reducido conserva todo visible.

## Correcciones aplicadas

- Coordinación del estado visible de las animaciones de scroll.
- Cobertura CSS del estado activo de navegación generado por JavaScript.
- Parallax corregido para desplazar solo la última capa del fondo hero; los degradados permanecen fijos y la propiedad CSS generada es válida.
- Contraste de textos auxiliares y acentos pequeños ajustado a WCAG AA.
- Destino y foco del enlace “Saltar al contenido principal” corregidos.
- Imagen Open Graph corregida para no producir un recurso roto.
- Hooks estructurales `seccion--servicios` y `footer__col` respaldados por reglas útiles.

## Dependencia pendiente

Los enlaces a `legal/aviso-legal.html`, `legal/privacidad.html` y `legal/cookies.html` ya estaban en el HTML, pero esos documentos no existen en la entrega. No se generaron textos legales ficticios: requieren los datos societarios y la política real de tratamiento de Saldantia antes de publicar.
