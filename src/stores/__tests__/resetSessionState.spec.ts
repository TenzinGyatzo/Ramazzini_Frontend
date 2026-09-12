import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { inicioResumenState } from '@/composables/inicioResumenCache';
import { useBorradoresNotaMedica } from '@/composables/useBorradoresNotaMedica';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useDocumentosStore } from '@/stores/documentos';
import { useEmpresasStore } from '@/stores/empresas';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { resetSessionScopedState } from '@/stores/resetSessionState';
import { useSidebarStore } from '@/stores/sidebar';
import { useTrabajadoresStore } from '@/stores/trabajadores';

describe('resetSessionScopedState', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('limpia breadcrumb y caches de tenant sin tocar preferencias de UI', () => {
    const empresas = useEmpresasStore();
    const centros = useCentrosTrabajoStore();
    const trabajadores = useTrabajadoresStore();
    const documentos = useDocumentosStore();
    const proveedor = useProveedorSaludStore();
    const sidebar = useSidebarStore();
    const collapsedBefore = sidebar.collapsed;
    const borradores = useBorradoresNotaMedica();

    empresas.currentEmpresaId = 'emp-a';
    empresas.currentEmpresa = { _id: 'emp-a', nombreComercial: 'Acme' } as any;
    empresas.empresas = [{ _id: 'emp-a', nombreComercial: 'Acme' } as any];

    centros.currentCentroTrabajoId = 'ct-a';
    centros.currentCentroTrabajo = { _id: 'ct-a', nombreCentro: 'Planta 1' } as any;

    trabajadores.currentTrabajadorId = 'tr-a';
    trabajadores.currentTrabajador = { _id: 'tr-a', nombre: 'Juan' } as any;

    documentos.currentTypeOfDocument = 'historiaClinica';
    documentos.currentDocument = { _id: 'doc-a' };
    documentos.documentsByYear = { 2026: { historiasClinicas: [{ _id: 'doc-a' }] } } as any;

    proveedor.proveedorSalud = { _id: 'prov-a', nombre: 'Clínica A' } as any;

    inicioResumenState.resumen.value = { hasActivity: true } as any;
    inicioResumenState.lastUserId.value = 'user-a';
    borradores.propios.value = [{ id: 'nm-1' } as any];

    resetSessionScopedState();

    expect(empresas.currentEmpresaId).toBeNull();
    expect(empresas.currentEmpresa).toBeNull();
    expect(empresas.empresas).toEqual([]);
    expect(centros.currentCentroTrabajoId).toBeUndefined();
    expect(trabajadores.currentTrabajadorId).toBeUndefined();
    expect(documentos.currentTypeOfDocument).toBeNull();
    expect(documentos.currentDocument).toBeNull();
    expect(documentos.documentsByYear).toEqual({});
    expect(proveedor.proveedorSalud).toBeNull();
    expect(inicioResumenState.resumen.value).toBeNull();
    expect(inicioResumenState.lastUserId.value).toBeNull();
    expect(borradores.propios.value).toEqual([]);
    expect(sidebar.collapsed).toBe(collapsedBefore);
  });
});
