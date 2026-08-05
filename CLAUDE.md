# CLAUDE.md

Guía para Claude Code (claude.ai/code) al trabajar en este repositorio (MakerUp).

## 🗺️ ARCHITECTURE.mmd — mantenlo actualizado (IMPORTANTE)

Los diagramas de arquitectura de MakerUp vive en
`ARCHITECTURE.mmd` y `ARCHITECTURE.en.mmd` del repo **Doplax/MakerApp-FrontEnd**, y cubren
este backend además del frontend.

**Se publica en https://doplax.dev**: la ficha de MakerUp descarga ese fichero
desde GitHub en crudo, así que NO es documentación interna — es lo que ve
cualquiera que entre en la web.

**Cuando hagas un cambio importante, actualiza el diagrama en el mismo commit.**
Cuenta como cambio importante:

- Añadir, quitar o renombrar un módulo, un área o un servicio.
- Empezar (o dejar) de usar un servicio externo: pasarela de pago, proveedor de
  email, almacenamiento, API de terceros, cola de mensajes…
- Cambiar la base de datos, el ORM o cómo se persiste algo.
- Cambiar el flujo de autenticación o el de pagos.
- Partir o fusionar aplicaciones dentro del repo.

No hace falta tocarlo por un cambio de estilos, un fix puntual o un refactor que
no mueva ninguna caja del diagrama.

Antes de terminar, comprueba que el diagrama sigue parseando —si no, la web deja
de mostrarlo:

```bash
npx -y @mermaid-js/mermaid-cli -i ARCHITECTURE.mmd -o /tmp/es.svg
npx -y @mermaid-js/mermaid-cli -i ARCHITECTURE.en.mmd -o /tmp/en.svg
```
