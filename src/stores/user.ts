import { ref, onMounted, computed } from "vue";
import { defineStore } from "pinia";
import AuthAPI from "@/api/AuthAPI";
import AssignmentsAPI from "@/api/AssignmentsAPI";
import { useRouter } from "vue-router";

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
    gestionarCuestionariosAdicionales: boolean;
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

    // Carga el usuario cuando el componente se monta
/*     onMounted(async () => {
        try {
            const { data } = await AuthAPI.auth();
            user.value = data; // Asegúrate de que `data` coincide con el tipo User
            console.log('Usuario', user.value);

            // Guardar el usuario en localStorage
            localStorage.setItem('user', JSON.stringify(user.value));
        } catch (error) {
            console.error(error);
        }
    }); */

      // Función para cargar el usuario cuando sea necesario
    async function fetchUser() {
        if (!user.value) {
        try {
            const { data } = await AuthAPI.auth();
            user.value = data;
            // console.log('Usuario cargado:', user.value);
            localStorage.setItem('user', JSON.stringify(user.value));
        } catch (error) {
            console.error("Error al cargar el usuario:", error);
        }
        }
    }

    // Computed para obtener el nombre de usuario
    const getUsername = computed(() => {
        if (!user.value?.username) return '';
        return user.value.username
            .split(' ') // Dividir en palabras
            .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalizar cada palabra
            .join(' '); // Unirlas de nuevo
    });
    
    
    function logout() {
        user.value = null;
        localStorage.removeItem("AUTH_TOKEN");
        router.push("/login");
    }

    async function registerUser(userData: User) {
        try {
            const resultado = await AuthAPI.registerUser(userData);
            return { success: true, data: resultado }; // Indicador de éxito y datos
        } catch (error) {
            return { success: false, error }; // Indicador de fallo y error
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
