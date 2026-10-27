import { createRouter, createWebHistory } from "vue-router";
import { urlLoginConRegreso } from "@/helpers/rutaDeRegreso";
import LayOut from "../views/LayOut.vue";
import axios from "axios";
import { useUserStore } from "@/stores/user";
import { usePostHog } from "../composables/usePostHog";
import { buildAnalyticsPageProperties } from "@/utils/sanitizeAnalyticsPath";
import { resetPostHogIdentity } from "@/utils/posthogIdentity";
import { registerAnalyticsRouter } from "@/utils/sanitizePosthogEvent";
import { useUserPermissions } from "@/composables/useUserPermissions";
import { useProveedorSaludStore } from "@/stores/proveedorSalud";
import { useIncapacidadesStore } from "@/stores/incapacidades";
import { resetSessionScopedState } from "@/stores/resetSessionState";
import {
  startNavigationProgress,
  finishNavigationProgress,
} from "@/composables/useNavigationProgress";
import { refreshConfidentialityAgreementStatus } from "@/composables/useConfidentialityAgreement";
import { shouldRedirectToPlatformConsole } from "@/composables/usePlatformContext";
import { tituloDeRuta } from "@/helpers/tituloPagina";

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
      component: LayOut,
      meta: { requiresAuth: true },
      children: [
        {
          path: "",
          name: "inicio",
          component: () => import("../views/InicioView.vue"),
          meta: { requiresAuth: true },
        },
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
          // La vista de asignaciones se retiró: empresas y centros se eligen en Permisos y accesos
          path: "/gestionar-asignaciones",
          redirect: { name: "manage-permissions" },
        },
        {
          path: "/admin/catalogos",
          name: "admin-catalogos",
          component: () => import("../views/CatalogosAdminView.vue"),
          // Catálogos globales: solo el Administrador de plataforma (sin flag ni régimen)
          meta: { requiresAuth: true, requiresAdmin: true },
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
          path: "modulos-funciones",
          name: "modulos-funciones",
          component: () => import("../views/ModulosFuncionesView.vue"),
          meta: { requiresAuth: true, requiresPrincipal: true },
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
          path: "/empresas/:idEmpresa/incapacidades",
          name: "incapacidades-empresa",
          component: () => import("../views/IncapacidadesEmpresaView.vue"),
          meta: { requiresAuth: true, requiresRiesgosTrabajo: true }
        },
        {
          path: "/empresas/:idEmpresa/incapacidades/informe",
          name: "incapacidades-informe",
          component: () => import("../views/IncapacidadesInformeView.vue"),
          meta: { requiresAuth: true, requiresRiesgosTrabajo: true }
        },
        {
          path: "/empresas/:idEmpresa/incapacidades/prima",
          name: "incapacidades-prima",
          component: () => import("../views/IncapacidadesPrimaView.vue"),
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
          path: "/empresas/:idEmpresa/centros-trabajo/:idCentroTrabajo/inventario",
          name: "inventario",
          component: () => import("../views/InventarioView.vue"),
        },
        {
          path: "/vigencias",
          name: "vigencias",
          component: () => import("../views/VigenciasView.vue"),
          meta: { requiresAuth: true, requiresVigencias: true },
        },
        {
          path: "/inventario",
          name: "inventario-catalogo",
          component: () => import("../views/InventarioCatalogoView.vue"),
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
          meta: { requiresPagoEnLinea: true },
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
          path: "/registros-administrador",
          name: "registros-administrador",
          component: () => import("@/views/RegistrosAdministradorView.vue"),
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
          meta: { requiresAuth: true, requiresPrincipalOnly: true, requiresSiresAudit: true },
        }
      ],
    },
  ],
});

registerAnalyticsRouter(router);
const { posthog, identifyUser } = usePostHog(); // Inicializamos PostHog

router.afterEach((to) => {
  finishNavigationProgress();
  // Título de la sección; las vistas con más detalle lo completan (useTituloPagina)
  document.title = tituloDeRuta(to.name);
  posthog.capture('$pageview', buildAnalyticsPageProperties(to));
});

router.beforeEach((to, from) => {
  if (from.path !== to.path) {
    posthog.capture('$pageleave', buildAnalyticsPageProperties(from));
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
    const requiresSiresAudit = to.meta.requiresSiresAudit;
    const userStore = useUserStore();
    const proveedorSaludStore = useProveedorSaludStore();

    try {
      if (requiresAuth) {
        await userStore.fetchUser();
        await refreshConfidentialityAgreementStatus();
        identifyUser();
      }
      
      const user = userStore.user;

      // Administrador de plataforma sin tenant activo: solo la consola de plataforma
      if (requiresAuth && shouldRedirectToPlatformConsole(user, to.name)) {
        return next({ name: "panel-administrador" });
      }

      // Validar si requiere ser admin y no lo es
      if (requiresAdmin && (!user || user.role !== "Administrador")) {
        console.warn("Acceso denegado: no eres administrador");
        return next({ name: "inicio" });
      }

      // Validar si requiere rol Principal exclusivamente (p. ej. auditoría)
      // (El Administrador de plataforma también, dentro del tenant activo: auditoría del tenant)
      if (
        requiresPrincipalOnly &&
        (!user || (user.role !== "Principal" && user.role !== "Administrador"))
      ) {
        console.warn("Acceso denegado: solo usuarios Principal pueden acceder");
        return next({ name: "inicio" });
      }

      // Validar si requiere rol Principal o Administrador
      if (
        requiresPrincipal &&
        (!user || (user.role !== "Principal" && user.role !== "Administrador"))
      ) {
        console.warn("Acceso denegado: esta vista es solo para el usuario Principal o el Administrador");
        return next({ name: "inicio" });
      }

      if (requiresSiresAudit && user?.idProveedorSalud) {
        if (!proveedorSaludStore.isProveedorLoaded) {
          await proveedorSaludStore.loadProveedorSalud(user.idProveedorSalud);
        }
      }

      if (requiresSiresAudit && !proveedorSaludStore.auditTrailEnabled) {
        console.warn("Acceso denegado: auditoría no habilitada para este proveedor");
        return next({ name: "inicio" });
      }

      // «Ver planes» (Mercado Pago) solo si Ramazzini habilitó el pago en línea al tenant
      if (to.meta.requiresPagoEnLinea) {
        if (user?.idProveedorSalud && !proveedorSaludStore.isProveedorLoaded) {
          await proveedorSaludStore.loadProveedorSalud(user.idProveedorSalud);
        }
        if (!proveedorSaludStore.pagoEnLineaHabilitado) {
          return next({ name: "suscripcion-activa" });
        }
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

      // Vigencias: solo con el módulo activado en «Módulos y funciones»
      if (to.meta.requiresVigencias && user) {
        if (user.idProveedorSalud && !proveedorSaludStore.isProveedorLoaded) {
          await proveedorSaludStore.loadProveedorSalud(user.idProveedorSalud);
        }
        if (proveedorSaludStore.proveedorSalud?.vigenciasHabilitadas !== true) {
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
        // Incapacidades por empresa: si la empresa no las gestiona, regresa a la empresa
        if (String(to.name ?? "").startsWith("incapacidades-") && to.params.idEmpresa) {
          const incapacidades = useIncapacidadesStore();
          await incapacidades.cargarConfiguracion();
          if (!incapacidades.gestionaEnEmpresa(to.params.idEmpresa)) {
            return next({ name: "centros-trabajo", params: { idEmpresa: to.params.idEmpresa } });
          }
        }
      }

      // Validar restricciones de documentos según permisos
      if (to.name === 'crear-documento' && user) {
        const { canCreateDocument } = useUserPermissions();
        const documentType = to.params.tipoDocumento as string;
        // La nota aclaratoria se rige por el documento que aclara
        const documentoOrigenTipo = (to.query.documentoOrigenTipo as string) || null;

        if (!canCreateDocument(documentType, documentoOrigenTipo)) {
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
      resetSessionScopedState();
      userStore.clearUser();
      resetPostHogIdentity();
      // Al entrar, el login regresa a la pantalla que se intentaba abrir
      next(urlLoginConRegreso(to.fullPath));
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
