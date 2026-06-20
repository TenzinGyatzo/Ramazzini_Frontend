import { createRouter, createWebHistory } from "vue-router";
import LayOut from "../views/LayOut.vue";
import axios from "axios";
import { useUserStore } from "@/stores/user";
import { usePostHog } from "../composables/usePostHog";
import { useUserPermissions } from "@/composables/useUserPermissions";
import { catalogAdminEnabled } from "@/composables/useCatalogAdminFeature";
import {
  startNavigationProgress,
  finishNavigationProgress,
} from "@/composables/useNavigationProgress";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/auth",
      name: "auth",
      component: () => import("@/views/auth/AuthView.vue"),
      meta: { hideSidebar: true },
      children: [
        {
          path: 'onboarding',
          name: 'onboarding',
          component: () => import('@/views/auth/OnboardingView.vue')
        },
        {
          path: 'confirmar-cuenta/:token',
          name: 'confirm-account',
          component: () => import('@/views/auth/ConfirmAccountView.vue')
        },
        {
          path: 'olvide-password',
          name: 'forgot-password',
          component: () => import('../views/auth/ForgotPasswordView.vue')
        },
        {
          path: 'olvide-password/:token',
          name: 'new-password',
          component: () => import('../views/auth/NewPasswordView.vue')
        },
      ]
    },    
    {
      path: "/login",
      name: "login",
      component: () => import("../views/LoginView.vue"),
    },
    {
      path: "/",
      name: "inicio",
      component: LayOut,
      meta: { requiresAuth: true },
      children: [
        {
          path: "/registrar-usuario",
          name: "add-user",
          component: () => import("../views/AddUserView.vue"),
          meta: { requiresAuth: true, requiresPrincipal: true },
        },
        {
          path: "/eliminar-usuarios",
          name: "remove-users",
          component: () => import("../views/RemoveUsersView.vue"),
          meta: { requiresAuth: true, requiresPrincipal: true },
        },
        {
          path: "/gestionar-permisos",
          name: "manage-permissions",
          component: () => import("../views/ManagePermissionsView.vue"),
          meta: { requiresAuth: true, requiresPrincipal: true },
        },
        {
          path: "/gestionar-asignaciones",
          name: "manage-assignments",
          component: () => import("../views/ManageAssignmentsView.vue"),
          meta: { requiresAuth: true, requiresPrincipal: true }
        },
        {
          path: "/admin/catalogos",
          name: "admin-catalogos",
          component: () => import("../views/CatalogosAdminView.vue"),
          meta: {
            requiresAuth: true,
            requiresPrincipal: true,
            requiresCatalogAdmin: true,
          },
        },
        {
          path: "/productividad-usuarios",
          name: "user-productivity",
          component: () => import("../views/UserProductivityView.vue"),
          meta: { requiresAuth: true, requiresPrincipal: true },
        },
        {
          path: "perfil-proveedor",
          name: "perfil-proveedor",
          component: () => import("../views/PerfilProveedorView.vue"),
        },
        {
          path: "medico-firmante",
          name: "medico-firmante",
          component: () => import("../views/MedicoFirmanteView.vue"),
        },
        {
          path: "enfermera-firmante",
          name: "enfermera-firmante",
          component: () => import("../views/EnfermeraFirmanteView.vue"),
        },
        {
          path: "tecnico-evaluador-firmante",
          name: "tecnico-evaluador-firmante",
          component: () => import("../views/TecnicoFirmanteView.vue"),
        },
        {
          path: "dashboard/:idEmpresa",
          name: "dashboard-empresa",
          component: () => import("../views/DashboardView.vue"),
          meta: { requiresAuth: true, requiresDashboardSalud: true }
        },
        {
          path: "riesgos-trabajo/:idEmpresa",
          name: "riesgos-trabajo",
          component: () => import("../views/RiesgosTrabajoView.vue"),
          meta: { requiresAuth: true, requiresRiesgosTrabajo: true }
        },
        {
          path: "dashboard-rt/:idEmpresa",
          name: "dashboard-rt",
          component: () => import("../views/DashboardRTsView.vue"),
          meta: { requiresAuth: true, requiresRiesgosTrabajo: true }
        },
        {
          path: "/informes-salud-ocupacional/:idEmpresa",
          name: "informes-salud-ocupacional",
          component: () => import("../views/InformesSOView.vue"),
        },
        {
          path: "empresas",
          name: "empresas",
          component: () => import("../views/EmpresasView.vue"),
        },
        {
          path: "/empresas/:idEmpresa/centros-trabajo",
          name: "centros-trabajo",
          component: () => import("../views/CentrosTrabajoView.vue"),
        },
        {
          path: "/empresas/:idEmpresa/centros-trabajo/:idCentroTrabajo/trabajadores",
          name: "trabajadores",
          component: () => import("../views/TrabajadoresView.vue"),
        },
        {
          path: "/empresas/:idEmpresa/centros-trabajo/:idCentroTrabajo/expediente-medico/:idTrabajador",
          name: "expediente-medico",
          component: () => import("../views/ExpedienteMedicoView.vue"),
        },
        {
          path: "/crear-documento/:idEmpresa/:idCentroTrabajo/:idTrabajador/:tipoDocumento/:idDocumento?",
          name: "crear-documento",
          component: () => import("../views/CrearDocumentoView.vue"),
        },
        {
          path: "/documento/:idDocumento",
          name: "documento",
          component: () => import("../views/InformeView.vue"),
        },
        {
          path: "/suscripcion",
          name: "subscription",
          component: () => import("../views/SubscriptionView.vue"),
        },
        {
          path: "/suscripcion-activa",
          name: "suscripcion-activa",
          component: () => import("../views/SuscripcionActivaView.vue"),
        },
        {
          path: "/suscripcion-exitosa",
          name: "subscription-success",
          component: () => import('@/views/auth/SubscriptionSuccess.vue'),
        },
        {
          path: "/panel-administrador",
          name: "panel-administrador",
          component: () => import("@/views/PanelAdministradorView.vue"),
          meta: { requiresAdmin: true },
        },
        {
          path: "/exportacion-giis",
          name: "exportacion-giis",
          component: () => import("@/views/ExportacionGiisView.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/auditoria",
          name: "auditoria",
          component: () => import("@/views/AuditoriaView.vue"),
          meta: { requiresAuth: true, requiresPrincipalOnly: true },
        }
      ],
    },
  ],
});

const { posthog, identifyUser } = usePostHog(); // Inicializamos PostHog

router.afterEach((to, from) => {
  finishNavigationProgress();
  posthog.capture('$pageview', {
    path: to.fullPath,
    name: to.name,
  });
});

router.beforeEach((to, from) => {
  if (from.path !== to.path) {
    posthog.capture('$pageleave')
    startNavigationProgress();
  }
})

// Configuración del guardia global
  router.beforeEach(async (to, from, next) => {
    // const requiresAuth = to.matched.some((url) => url.meta.requiresAuth);
    const requiresAuth = to.meta.requiresAuth; // Verifica solo la ruta actual
    const requiresAdmin = to.meta.requiresAdmin; // Verifica solo
    const requiresPrincipal = to.meta.requiresPrincipal; // Verifica solo
    const requiresPrincipalOnly = to.meta.requiresPrincipalOnly;
    const requiresCatalogAdmin = to.meta.requiresCatalogAdmin;
    const userStore = useUserStore();

    try {
      if (requiresAuth) {
        await userStore.fetchUser();
        identifyUser();
      }
      
      const user = userStore.user;

      // Validar si requiere ser admin y no lo es
      if (requiresAdmin && (!user || user.role !== "Administrador")) {
        console.warn("Acceso denegado: no eres administrador");
        return next({ name: "inicio" });
      }

      // Validar si requiere rol Principal exclusivamente (p. ej. auditoría)
      if (requiresPrincipalOnly && (!user || user.role !== "Principal")) {
        console.warn("Acceso denegado: solo usuarios Principal pueden acceder");
        return next({ name: "inicio" });
      }

      // Validar si requiere rol Principal o Administrador
      if (
        requiresPrincipal &&
        (!user || (user.role !== "Principal" && user.role !== "Administrador"))
      ) {
        console.warn("Acceso denegado: solo usuarios Principal o Administrador pueden gestionar asignaciones");
        return next({ name: "inicio" });
      }

      if (requiresCatalogAdmin && !catalogAdminEnabled) {
        console.warn("Acceso denegado: administración de catálogos no habilitada");
        return next({ name: "inicio" });
      }

      // Validar si requiere acceso al dashboard de salud
      const requiresDashboardSalud = to.meta.requiresDashboardSalud;
      if (requiresDashboardSalud && user) {
        const { canAccessDashboardSalud } = useUserPermissions();
        if (!canAccessDashboardSalud.value) {
          console.warn("Acceso denegado: no tienes permisos para acceder al dashboard de salud");
          return next({ name: "inicio" });
        }
      }

      // Validar si requiere acceso a riesgos de trabajo
      const requiresRiesgosTrabajo = to.meta.requiresRiesgosTrabajo;
      if (requiresRiesgosTrabajo && user) {
        const { canAccessRiesgosTrabajo } = useUserPermissions();
        if (!canAccessRiesgosTrabajo.value) {
          console.warn("Acceso denegado: no tienes permisos para acceder a riesgos de trabajo");
          return next({ name: "inicio" });
        }
      }

      // Validar restricciones de documentos según permisos
      if (to.name === 'crear-documento' && user) {
        const { canCreateDocument } = useUserPermissions();
        const documentType = to.params.tipoDocumento as string;
        
        if (!canCreateDocument(documentType)) {
          console.warn(`Acceso denegado: Usuario ${user.username} (${user.role}) no tiene permisos para crear documento ${documentType}`);
          return next({ name: "expediente-medico", params: { 
            idEmpresa: to.params.idEmpresa,
            idCentroTrabajo: to.params.idCentroTrabajo,
            idTrabajador: to.params.idTrabajador
          }});
        }
      }

      next();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        console.log('No autorizado');
      } else {
        console.error("Error inesperado:", error);
      }
      next("/login");
    }
  });

/*   if (requiresAuth) {
    try {
      await userStore.fetchUser();
      await AuthAPI.auth();
      next();
    } catch (error) {
      // Verificar que error es un objeto con la propiedad `response`
      if (axios.isAxiosError(error) && error.response) {
        console.log('No autorizado');
      } else {
        console.error("Error inesperado:", error);
      }
      next("/login");
    }
  } else {
    next();
  } */

export default router;
