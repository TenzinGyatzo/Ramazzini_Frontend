# Plantillas de Importación de Trabajadores

## Archivos

| Archivo | Régimen | Columnas |
|---------|---------|----------|
| `Plantilla para Importar Trabajadores.xlsx` | SIN_REGIMEN | 12 columnas básicas |
| `Plantilla Importar Trabajadores SIRES NOM024.xlsx` | SIRES_NOM024 | 19 columnas (básicas + CURP + geo) |

## Plantilla SIN_REGIMEN (12 columnas)

`numeroEmpleado`, `nss`, `primerApellido`, `segundoApellido`, `nombre`, `fechaNacimiento`, `sexo`, `escolaridad`, `puesto`, `fechaIngreso`, `telefono`, `estadoCivil`

- `numeroEmpleado`, `nss`, `telefono`, `fechaIngreso`, `segundoApellido`: opcionales
- Resto: obligatorios para importación

## Plantilla SIRES_NOM024 (19 columnas)

Las 12 columnas básicas más:

| Columna | Descripción |
|---------|-------------|
| `curp` | CURP RENAPO (18 caracteres). Obligatorio. |
| `entidadNacimiento` | Código INEGI 2 dígitos (01-32, NE, 00) |
| `paisNacimiento` | CATALOG_KEY cat_pais (ej. 142 = México) |
| `entidadResidencia` | Código INEGI 2 dígitos |
| `municipioResidencia` | Código INEGI 3 dígitos |
| `localidadResidencia` | Código INEGI 4 dígitos |
| `paisResidencia` | CATALOG_KEY cat_pais |

Todos los campos NOM-024 son **obligatorios** para proveedores en régimen SIRES_NOM024.

## Comentarios en encabezados

Cada encabezado incluye una nota de ayuda (OBLIGATORIO / OPCIONAL y reglas de formato). Las notas están **ocultas por defecto**; pase el cursor sobre el triángulo rojo en la esquina de la celda para verlas.

## Regenerar plantillas

Desde la carpeta `backend`:

```bash
npm run generate:import-templates
```

El script escribe ambos archivos en `frontend/public/template/`.

## Catálogos de referencia (solo SIRES_NOM024)

En el modal **Importar Trabajadores** (régimen SIRES) hay una sección de apoyo geo:

1. **Consultar códigos** — buscador jerárquico (país, entidad, municipio, localidad) con botón copiar.
2. **Descargar CSV** — catálogos de países, entidades y municipios; localidades solo del municipio seleccionado.

Los archivos CSV se generan desde los mismos catálogos que valida la importación (`GET /api/catalogs/import-reference/:type/export`).

## Compatibilidad

- No elimine ni renombre columnas de encabezado.
- La fila 2 contiene datos ficticios de ejemplo; sustitúyalos por datos reales.
- El backend acepta encabezados en camelCase (como en la plantilla) o alias en español para campos geo.
