import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  COMMERCIAL_EDITION_FALLBACK,
  SIRES_EDITION_FALLBACK,
  readCommercialEditionVersion,
  readSiresEditionVersion,
} from './readProductVersion'

function writeTempChangelog(body: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'ramazzini-edition-'))
  const path = join(dir, 'CHANGELOG.md')
  writeFileSync(path, body, 'utf-8')
  return path
}

describe('readProductVersion', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lee el folio SIRES desde CHANGELOG-SIRES', () => {
    const path = writeTempChangelog(
      '**Versión vigente de la línea SIRES:** `v1.0.3`\n',
    )
    expect(readSiresEditionVersion(path)).toBe('v1.0.3')
  })

  it('lee el folio comercial desde CHANGELOG-RAMAZZINI', () => {
    const path = writeTempChangelog(
      '**Versión vigente de la línea comercial:** `v2.0.0`\n',
    )
    expect(readCommercialEditionVersion(path)).toBe('v2.0.0')
  })

  it('si falta el archivo SIRES, usa el fallback documentado v1.0.3', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const missing = join(tmpdir(), 'no-existe-sires-changelog.md')
    expect(readSiresEditionVersion(missing)).toBe(SIRES_EDITION_FALLBACK)
    expect(SIRES_EDITION_FALLBACK).toBe('v1.0.3')
    expect(warn).toHaveBeenCalled()
  })

  it('si falta el archivo comercial, usa v2.0.0 y nunca 1.0.3', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const missing = join(tmpdir(), 'no-existe-comercial-changelog.md')
    const version = readCommercialEditionVersion(missing)
    expect(version).toBe(COMMERCIAL_EDITION_FALLBACK)
    expect(version).toBe('v2.0.0')
    expect(version).not.toContain('1.0.3')
    expect(warn).toHaveBeenCalled()
  })

  it('si el comercial no tiene campo parseable, no cae a 1.0.3', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const path = writeTempChangelog(
      '**Versión vigente del software:** `v1.0.3`\n',
    )
    const version = readCommercialEditionVersion(path)
    expect(version).toBe('v2.0.0')
    expect(version).not.toBe('v1.0.3')
    expect(warn).toHaveBeenCalled()
  })

  it('parsea los registros reales del monorepo', () => {
    expect(readSiresEditionVersion()).toBe('v1.0.3')
    expect(readCommercialEditionVersion()).toBe('v2.0.0')
  })

  it('no toma el folio SIRES cuando se pide la línea comercial', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const path = writeTempChangelog(
      '**Versión vigente de la línea SIRES:** `v1.0.3`\n',
    )
    expect(readCommercialEditionVersion(path)).toBe('v2.0.0')
    expect(warn).toHaveBeenCalled()
  })
})
