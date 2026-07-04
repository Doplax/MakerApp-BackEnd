import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Siembra el catálogo de impresoras con ~29 modelos y su ficha técnica (volumen,
 * boquilla, consumo, precio orientativo EUR, enlace oficial y descripción),
 * investigada desde fuentes oficiales (julio 2026).
 *
 * SEGURIDAD (aditiva y "seed once"): solo inserta si la tabla `printer_catalog`
 * está COMPLETAMENTE VACÍA. Si ya hay filas (porque el admin usó "Cargar modelos
 * predefinidos" o creó/editó entradas), NO toca nada. Así los despliegues sucesivos
 * son inocuos y el admin conserva el control total del catálogo. Idempotente.
 *
 * La imagen NO se guarda: el front la resuelve por marca+modelo (`resolvePrinterImage`).
 * Debe quedar sincronizada con `DEFAULT_PRINTER_MODELS` del front (mismo dataset).
 */
export class SeedPrinterCatalog1786500000000 implements MigrationInterface {
  name = 'SeedPrinterCatalog1786500000000';

  // [brand, model, type, X, Y, Z, nozzle, power(W), price(EUR), currency, purchaseUrl, description]
  private readonly rows: (string | number | null)[][] = [
    ['Anycubic', 'Kobra S1', 'FDM', 250, 250, 250, 0.4, 1500, 449, 'EUR', 'https://store.anycubic.com/products/kobra-s1', 'Impresora FDM CoreXY cerrada (250×250×250 mm) con hotend hasta 320 °C, cama a 120 °C, hasta 600 mm/s y multicolor opcional con el módulo ACE Pro.'],
    ['Anycubic', 'Kobra S1 Max', 'FDM', 350, 350, 350, 0.4, 2200, 899, 'EUR', 'https://store.anycubic.com/products/kobra-s1-max', 'Versión de gran formato (350×350×350 mm) de la Kobra S1: FDM CoreXY cerrada con cámara calefactada, hotend de 350 °C y multicolor de hasta 16 colores con ACE 2 Pro.'],
    ['Anycubic', 'Kobra X1', 'FDM', 260, 260, 260, 0.4, null, null, 'EUR', null, 'Impresora FDM de sobremesa multicolor (4 colores nativos), volumen 260×260×260 mm. Verifica el modelo: el producto oficial más cercano es la Anycubic Kobra X.'],
    ['Bambu Lab', 'A1', 'FDM', 256, 256, 256, 0.4, 1300, 319, 'EUR', 'https://bambulab.com/en/a1', 'Impresora FDM de cama móvil (bed-slinger) con AMS Lite para multicolor, calibración automática y cambio rápido de boquilla.'],
    ['Bambu Lab', 'A1 mini', 'FDM', 180, 180, 180, 0.4, 150, 199, 'EUR', 'https://bambulab.com/en/a1-mini', 'Impresora FDM compacta de cama móvil (180 mm) compatible con AMS Lite multicolor y de muy bajo consumo (PSU de 150 W).'],
    ['Bambu Lab', 'A2L', 'FDM', 330, 320, 325, 0.4, 1000, 379, 'EUR', 'https://bambulab.com/en/a2l', 'Impresora FDM de gran formato y marco abierto de la serie A, con módulo de corte opcional y compatible con AMS Lite multicolor.'],
    ['Bambu Lab', 'H2C', 'FDM', 305, 320, 325, 0.4, null, 2249, 'EUR', 'https://bambulab.com/en-us/h2c', 'FDM CoreXY cerrada de gama alta con sistema Vortek de cambio de boquillas (hasta 7 materiales sin purga) y cámara calefactada.'],
    ['Bambu Lab', 'H2D', 'FDM', 325, 320, 325, 0.4, 2200, 1899, 'EUR', 'https://bambulab.com/en/h2d', 'FDM CoreXY cerrada de gran formato con doble boquilla, cámara calefactada a 65 °C y módulo láser/corte opcional.'],
    ['Bambu Lab', 'H2S', 'FDM', 340, 320, 340, 0.4, 2050, 1249, 'EUR', 'https://bambulab.com/en-us/h2s', 'FDM CoreXY cerrada de gran formato y boquilla única, con cámara calefactada y monitorización por IA (23 sensores, 3 cámaras).'],
    ['Bambu Lab', 'P1S', 'FDM', 256, 256, 256, 0.4, 1000, 599, 'EUR', 'https://us.store.bambulab.com/products/p1s', 'Impresora FDM CoreXY con cámara cerrada, hotend de 300 °C y compatibilidad con AMS para multicolor.'],
    ['Bambu Lab', 'P2S', 'FDM', 256, 256, 256, 0.4, 1200, 523, 'EUR', 'https://bambulab.com/en-us/p2s', 'FDM CoreXY cerrada, sucesora de la P1S, con extrusor servo PMSM y compatibilidad AMS multicolor.'],
    ['Bambu Lab', 'X1C', 'FDM', 256, 256, 256, 0.4, 1000, 1199, 'EUR', 'https://bambulab.com/en/x1', 'FDM CoreXY cerrada tope de gama con hotend de 300 °C, LiDAR para calibración y AMS para multicolor.'],
    ['Creality', 'Ender 3', 'FDM', 220, 220, 250, 0.4, 360, 189, 'EUR', 'https://www.creality.com/products/ender-3-3d-printer', 'Impresora FDM cartesiana (i3) clásica de 220×220×250 mm con extrusor Bowden y hotend hasta 250 °C, el kit económico que popularizó la impresión 3D.'],
    ['Creality', 'K2', 'FDM', 260, 260, 260, 0.4, null, 549, 'EUR', 'https://www.creality.com/products/k2-series-3d-printer', 'Serie K2: FDM CoreXY de 260×260×260 mm con hotend de 300 °C y multicolor por CFS.'],
    ['Creality', 'Spark X7', 'FDM', 260, 260, 255, 0.4, 700, 399, 'EUR', 'https://www.creality.com/products/sparkx-i7', 'FDM cartesiana (nombre oficial SPARKX i7) de 260×260×255 mm, hasta 500 mm/s, multicolor de 4 colores por CFS Lite y cámara con IA anti-fallos.'],
    ['Elegoo', 'Centauri Carbon', 'FDM', 256, 256, 256, 0.4, 1100, 299, 'EUR', 'https://eu.elegoo.com/en-es/products/centauri-carbon', 'FDM CoreXY cerrada (256×256×256 mm) hasta 500 mm/s, con boquilla de acero endurecido a 320 °C para filamentos con fibra de carbono.'],
    ['Elegoo', 'Centauri Carbon 2', 'FDM', 256, 256, 256, 0.4, null, 329, 'EUR', 'https://eu.elegoo.com/en-es/products/centauri-carbon-2', 'Evolución multicolor y multimaterial de la Centauri Carbon: CoreXY cerrada (256 mm), hasta 500 mm/s y boquilla endurecida de 350 °C.'],
    ['Elegoo', 'OrangeStorm Giga', 'FDM', 800, 800, 1000, 0.4, 1800, 2399, 'EUR', 'https://eu.elegoo.com/en-es/products/orangestorm-giga', 'FDM de gran formato (800×800×1000 mm) con cama dividida en cuatro plataformas PEI y boquilla de latón hasta 300 °C, para piezas de gran tamaño.'],
    ['Flashforge', 'AD5X', 'FDM', 220, 220, 220, 0.4, 650, 379, 'EUR', 'https://www.flashforge.com/products/flashforge-ad5x-3d-printer', 'FDM CoreXY multicolor de hasta 4 filamentos (220×220×220 mm) derivada de la Adventurer 5M, con extrusor directo hasta 300 °C y cambio rápido de boquilla.'],
    ['Flashforge', 'Creator 5', 'FDM', 256, 256, 256, 0.4, 700, 679, 'EUR', 'https://www.flashforge.com/products/flashforge-creator-5', 'FDM CoreXY con cambiador de 4 cabezales independientes (multimaterial sin purga) y volumen de 256×256×256 mm, versión de bastidor abierto.'],
    ['Flashforge', 'Creator 5 Pro', 'FDM', 256, 256, 256, 0.4, 1200, 829, 'EUR', 'https://www.flashforge.com/products/flashforge-creator-5-pro', 'Versión Pro cerrada con cámara calefactada hasta 65 °C y filtración HEPA: FDM CoreXY con 4 cabezales intercambiables (256 mm) para ABS/ASA.'],
    ['Prusa', 'Core One', 'FDM', 250, 220, 270, 0.4, 110, 1349, 'EUR', 'https://www.prusa3d.com/product/prusa-core-one/', 'FDM CoreXY totalmente cerrada con cámara calefactada activa hasta 55 °C, extrusor directo y estructura tipo exoesqueleto para alta velocidad.'],
    ['Prusa', 'Core One L', 'FDM', 300, 300, 330, 0.4, 215, 1849, 'EUR', 'https://www.prusa3d.com/product/prusa-core-one-l-2/', 'Versión de gran formato de la Core One: CoreXY cerrada con 30 L (300×300×330 mm), cama de aluminio por convección y cámara activa hasta 60 °C.'],
    ['Prusa', 'MK3', 'FDM', 250, 210, 210, 0.4, 120, null, 'EUR', 'https://www.prusa3d.com/category/original-prusa-i3-mk3s/', 'Original Prusa i3 MK3S+, FDM cartesiana con extrusor directo Bondtech y láminas de acero PEI extraíbles (descatalogada salvo edición aniversario).'],
    ['Prusa', 'MK3.5', 'FDM', 250, 210, 210, 0.4, 120, null, 'EUR', 'https://www.prusa3d.com/product/original-prusa-mk3-5s-3d-printer/', 'Modernización del MK3S+ (electrónica xBuddy de 32 bits, Input Shaper y Wi-Fi/LAN) conservando chasis y volumen; se vende como kit.'],
    ['Prusa', 'MK4S', 'FDM', 250, 210, 220, 0.4, 120, 1099, 'EUR', 'https://www.prusa3d.com/product/original-prusa-mk4s-3d-printer/', 'Buque insignia FDM cartesiano (i3) con extrusor directo Nextruder, autonivelación por célula de carga y boquilla de alto caudal CHT.'],
    ['Prusa', 'Mini+', 'FDM', 180, 180, 180, 0.4, 160, 509, 'EUR', 'https://www.prusa3d.com/category/original-prusa-mini/', 'Impresora FDM cartesiana compacta (180 mm) con nivelación automática, hotend íntegramente metálico y conectividad de red; se entrega semimontada.'],
    ['Prusa', 'XL', 'FDM', 360, 360, 360, 0.4, 235, 2299, 'EUR', 'https://www.prusa3d.com/product/original-prusa-xl-assembled-single-toolhead-3d-printer/', 'FDM CoreXY de gran formato (360 mm) con extrusor Nextruder y cama segmentada en 16 zonas independientes; ampliable hasta 5 cabezales.'],
    ['Snapmaker', 'U1', 'FDM', 270, 270, 270, 0.4, 1150, 899, 'EUR', 'https://eu.snapmaker.com/products/snapmaker-u1-3d-printer', 'FDM CoreXY con sistema SnapSwap de 4 cabezales (cambio en ~5 s) y volumen de 270×270×270 mm, para multicolor y multimaterial con bajo desperdicio.'],
  ];

  private readonly cols = [
    'brand', 'model', 'type', 'buildVolumeX', 'buildVolumeY', 'buildVolumeZ',
    'nozzleDiameter', 'powerConsumption', 'referencePrice', 'currency',
    'purchaseUrl', 'description',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const existing = await queryRunner.query(
      `SELECT COUNT(*)::int AS count FROM printer_catalog`,
    );
    const count = Number(existing?.[0]?.count ?? 0);
    if (count > 0) {
      // Ya hay datos (admin lo pobló/gestionó) → no tocar nada.
      return;
    }

    const values = this.rows
      .map(
        (_, i) =>
          `(${this.cols.map((_, j) => `$${i * this.cols.length + j + 1}`).join(', ')})`,
      )
      .join(', ');
    const params = this.rows.flat();
    const colList = this.cols.map((c) => `"${c}"`).join(', ');

    await queryRunner.query(
      `INSERT INTO printer_catalog (${colList}) VALUES ${values}`,
      params,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Inverso: elimina exactamente los modelos sembrados (por marca+modelo).
    // No borra entradas creadas a mano por el admin con otro nombre.
    for (const row of this.rows) {
      await queryRunner.query(
        `DELETE FROM printer_catalog WHERE brand = $1 AND model = $2`,
        [row[0], row[1]],
      );
    }
  }
}
