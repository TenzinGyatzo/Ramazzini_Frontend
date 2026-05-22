import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Debe coincidir con `**Versión vigente del software:** \`vX.Y\`` en `backend/CHANGELOG.md`. */
const VIGENTE_RE =
  /\*\*Versión vigente del software:\*\*\s*`(v\d+\.\d+)`/m

function readVersionFromPackageJson(): string {
  const scriptDir = dirname(fileURLToPath(import.meta.url))
  const pkgPath = join(scriptDir, '..', 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version?: string }
  const [major = '0', minor = '0'] = String(pkg.version ?? '0.0.0').split('.')
  return `v${major}.${minor}`
}

export function readProductVersionFromChangelog(changelogPath: string): string {
  if (!existsSync(changelogPath)) {
    console.warn(
      `[readProductVersion] No existe ${changelogPath}; usando version de frontend/package.json`,
    )
    return readVersionFromPackageJson()
  }

  const text = readFileSync(changelogPath, 'utf-8')
  const m = text.match(VIGENTE_RE)
  if (!m) {
    console.warn(
      `[readProductVersion] Formato de version no encontrado en CHANGELOG; usando package.json`,
    )
    return readVersionFromPackageJson()
  }
  return m[1]
}
