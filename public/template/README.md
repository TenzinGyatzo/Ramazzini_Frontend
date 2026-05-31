# Plantilla de Importación de Trabajadores

## Archivo: `Plantilla para Importar Trabajadores.xlsx`

Esta plantilla se utiliza para la importación masiva de trabajadores al sistema.

## Columnas Requeridas (NOM-024 - Actualización Phase 1)

### Datos Personales Básicos
- **Num. Trab.** (opcional): Número de empleado
- **Primer Apellido** (requerido)
- **Segundo Apellido** (requerido)
- **Nombre** (requerido)
- **NSS** (opcional): Número de Seguridad Social (11 dígitos)
- **Edad** (requerido)
- **Sexo** (requerido): Masculino/Femenino
- **Escolaridad** (requerido)

### **NUEVAS COLUMNAS NOM-024 (Phase 1)**
Las siguientes columnas fueron agregadas para cumplir con NOM-024-SSA3-2012:

- **Entidad Nacimiento**: Código INEGI de 2 dígitos (ej. "09" para Ciudad de México)
  - Campo: `entidadNacimiento`
  - Obligatorio para proveedores MX
  - Valores especiales: "NE" (No Especificado), "00" (Nacido en el extranjero)

- **País de nacimiento**: CATALOG_KEY numérico de cat_pais (ej. `142` para México, `248` para NO ESPECIFICADO)
  - Campo: `paisNacimiento`
  - Obligatorio para proveedores MX
  - Formato: número entero (CATALOG_KEY del catálogo cat_pais)

- **Entidad Residencia**: Código INEGI de 2 dígitos
  - Campo: `entidadResidencia`
  - Obligatorio para proveedores MX
  - Valores especiales: "NE" (No Especificado)

- **Municipio Residencia**: Código INEGI de 3 dígitos
  - Campo: `municipioResidencia`
  - Obligatorio para proveedores MX
  - Formato: 3 dígitos (ej. "015")

- **Localidad Residencia**: Código INEGI de 4 dígitos
  - Campo: `localidadResidencia`
  - Obligatorio para proveedores MX
  - Formato: 4 dígitos (ej. "0001")
  - Valores especiales: "NND" (No Hay Dato)

### Datos Laborales
- **Puesto** (requerido)
- **Antigüedad** (requerido)
- **Teléfono** (opcional)
- **Estado Civil** (requerido)

### Datos de Salud
- IMC, Circunferencia Cintura, Tensión Arterial, etc.
- Antecedentes Personales Patológicos
- Aptitud, Audiometría, Agentes de Riesgo

## Instrucciones para Actualizar la Plantilla

1. **Abrir el archivo Excel**: `Plantilla para Importar Trabajadores.xlsx`

2. **Insertar las 5 nuevas columnas** después de "Escolaridad" y antes de "Puesto":
   - Columna I: `Entidad Nacimiento`
   - Columna J: `País de nacimiento`
   - Columna K: `Entidad Residencia`
   - Columna L: `Municipio Residencia`
   - Columna M: `Localidad Residencia`

3. **Agregar datos de ejemplo** para cada columna:
   - Entidad Nacimiento: `09` (ejemplo: Ciudad de México)
   - País de nacimiento: `142` (ejemplo: México)
   - Entidad Residencia: `09`
   - Municipio Residencia: `015`
   - Localidad Residencia: `0001`

4. **Guardar el archivo** manteniendo el formato `.xlsx`

## Compatibilidad hacia atrás

✅ **Plantillas antiguas siguen funcionando**: Si el archivo Excel no incluye las nuevas columnas, el sistema las tratará como vacías y:
- Para proveedores **MX**: el backend rechazará los registros por campos faltantes (validación NOM-024)
- Para proveedores **no-MX**: los registros se importarán sin problema

## Validación Backend

El backend valida:
- Formato de códigos INEGI
- Obligatoriedad condicional según país del proveedor
- Longitud y formato de campos
- Códigos válidos según catálogos oficiales

## Export de Trabajadores

El archivo de exportación (`exportarExcel.ts`) ya incluye estas columnas automáticamente, por lo que cualquier export generará archivos con la estructura actualizada.

## Referencias

- NOM-024-SSA3-2012: Sistemas de información de registro electrónico para la salud
- Catálogos INEGI: Códigos de entidades, municipios y localidades
- Task: FE-TASK-12 (Task 32) - Phase 1 NOM-024








