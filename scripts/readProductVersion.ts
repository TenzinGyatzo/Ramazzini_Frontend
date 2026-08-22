import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Fallback documentado de la línea SIRES si falta el archivo o el campo parseable. */
export const SIRES_EDITION_FALLBACK = 'v1.0.3'

/** Fallback documentado de la línea comercial. Nunca usar 1.0.3 / package.json. */
export const COMMERCIAL_EDITION_FALLBACK = 'v2.0.0'

const VIGENTE_LINEA_RE =
  /\*\*Versión vigente de la línea (SIRES|comercial):\*\*\s*`(v\d+\.\d+\.\d+)`/m

function changelogDir(): string {
  const scriptDir = dirname(fileURLToPath(import.meta.url))
  return join(scriptDir, '..', '..', 'backend')
}

export function readEditionVersionFromChangelog(
  changelogPath: string,
  expectedLinea: 'SIRES' | 'comercial',
  fallback: string,
): string {
  if (!existsSync(changelogPath)) {
    console.warn(
      `[readProductVersion] No existe ${changelogPath}; usando fallback ${fallback} (línea ${expectedLinea})`,
    )
    return fallback
  }

  const text = readFileSync(changelogPath, 'utf-8')
  const m = text.match(VIGENTE_LINEA_RE)
  if (!m || m[1] !== expectedLinea) {
    console.warn(
      `[readProductVersion] Formato de versión de la línea ${expectedLinea} no encontrado en ${changelogPath}; usando fallback ${fallback}`,
    )
    return fallback
  }
  return m[2]
}

export function readSiresEditionVersion(changelogPath?: string): string {
  const path = changelogPath ?? join(changelogDir(), 'CHANGELOG-SIRES.md')
  return readEditionVersionFromChangelog(path, 'SIRES', SIRES_EDITION_FALLBACK)
}

export function readCommercialEditionVersion(changelogPath?: string): string {
  const path = changelogPath ?? join(changelogDir(), 'CHANGELOG-RAMAZZINI.md')
  return readEditionVersionFromChangelog(
    path,
    'comercial',
    COMMERCIAL_EDITION_FALLBACK,
  )
}
