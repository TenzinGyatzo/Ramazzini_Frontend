import { ref, computed } from "vue";
import { defineStore } from "pinia";
import AuthAPI from "@/api/AuthAPI";
import AssignmentsAPI from "@/api/AssignmentsAPI";
import { useRouter } from "vue-router";
import { useProveedorSaludStore } from "@/stores/proveedorSalud";

// Define el tipo para el objeto usuario
interface User {
    _id: string;
    username: string;
    email: string;
    role: string;
    idProveedorSalud?: string;
  permisos?: {
    gestionarEmpresas: boolean;
    gestionarCentrosTrabajo: boolean;
    gestionarTrabajadores: boolean;
    gestionarDocumentosDiagnostico: boolean;
    gestionarDocumentosEvaluacion: boolean;
    gestionarDocumentosExternos: boolean;
    gestionarOtrosDocumentos: boolean;
    gestionarCuestionariosAdicionales?: boolean;
    accesoCompletoEmpresasCentros: boolean;
    accesoDashboardSalud: boolean;
    accesoRiesgosTrabajo: boolean;
  };
    cuentaActiva?: boolean;
    empresasAsignadas?: string[];
    centrosTrabajoAsignados?: string[];
}

// Define el store
export const useUserStore = defineStore("user", () => {

    const router = useRouter();
    const user = ref<User | null>(null);
    const empresasAsignadas = ref<string[]>([]);
    const centrosTrabajoAsignados = ref<string[]>([]);
    let fetchUserPromise: Promise<void> | null = null;

    function clearUser() {
        user.value = null;
        empresasAsignadas.value = [];
        centrosTrabajoAsignados.value = [];
        fetchUserPromise = null;
    }

    async function fetchUser(force = false) {
        if (!force && user.value) {
            return;
        }

        if (fetchUserPromise) {
            return fetchUserPromise;
        }

        fetchUserPromise = (async () => {
            try {
                const { data } = await AuthAPI.auth();
                user.value = data;
                try {
                    localStorage.removeItem('user');
                } catch {
                    // ignore
                }
            } catch (error) {
                user.value = null;
                console.error("Error al cargar el usuario:", error);
                throw error;
            } finally {
                fetchUserPromise = null;
            }
        })();

        return fetchUserPromise;
    }

    // Computed para obtener el nombre de usuario
    const getUsername = computed(() => {
        if (!user.value?.username) return '';
        return user.value.username
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    });
    
    
    function logout() {
        clearUser();
        const proveedorSaludStore = useProveedorSaludStore();
        proveedorSaludStore.clear();
        try {
            localStorage.removeItem('user');
            localStorage.removeItem('proveedorSalud');
            localStorage.removeItem('AUTH_SID');
        } catch {
            // ignore
        }
        AuthAPI.logout().catch(() => {});
        router.push("/login");
    }

    async function registerUser(userData: User) {
        try {
            const resultado = await AuthAPI.registerUser(userData);
            return { success: true, data: resultado };
        } catch (error) {
            return { success: false, error };
        }
    }

    async function inviteUser(userData: Omit<User, '_id' | 'idProveedorSalud'>) {
        try {
            const resultado = await AuthAPI.inviteUser(userData);
            return { success: true, data: resultado };
        } catch (error) {
            return { success: false, error };
        }
    }

    async function fetchUsersByProveedorId(idProveedorSalud: string) {
        try {
            const { data } = await AuthAPI.getUsersByProveedorId(idProveedorSalud);
            return { success: true, data };
        } catch (error) {
            return { success: false, error };
        }
    }

    async function loadUserAssignments() {
        if (!user.value?._id) return;
        
        try {
            const { data } = await AssignmentsAPI.getUserAssignments(user.value._id);
            empresasAsignadas.value = data.empresasAsignadas || [];
            centrosTrabajoAsignados.value = data.centrosTrabajoAsignados || [];
        } catch (error) {
            console.error('Error al cargar asignaciones del usuario:', error);
        }
    }

    function hasAccessToEmpresa(empresaId: string): boolean {
        if (!user.value) return false;
        if (user.value.role === 'Principal') return true;
        if (user.value.permisos?.accesoCompletoEmpresasCentros) return true;
        return empresasAsignadas.value.includes(empresaId);
    }

    function hasAccessToCentro(centroId: string): boolean {
        if (!user.value) return false;
        if (user.value.role === 'Principal') return true;
        if (user.value.permisos?.accesoCompletoEmpresasCentros) return true;
        return centrosTrabajoAsignados.value.includes(centroId);
    }

    function isPrincipal(): boolean {
        return user.value?.role === 'Principal';
    }
    
    return {
        user,
        empresasAsignadas,
        centrosTrabajoAsignados,
        fetchUser,
        clearUser,
        logout,
        registerUser,
        inviteUser,
        fetchUsersByProveedorId,
        loadUserAssignments,
        hasAccessToEmpresa,
        hasAccessToCentro,
        isPrincipal,
        getUsername,
    };
});
