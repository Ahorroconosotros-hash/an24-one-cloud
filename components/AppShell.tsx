"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import styles from "./AppShell.module.css";
import { supabaseBrowser } from "@/lib/supabase-browser";
import GlobalSearch from "@/components/topbar/GlobalSearch";
import ProactiveCenter from "@/components/topbar/ProactiveCenter";

type AppShellProps = {
  children: ReactNode;
};

type IconName =
  | "home"
  | "clients"
  | "target"
  | "calendar"
  | "products"
  | "team"
  | "operations"
  | "documents"
  | "reports"
  | "settings"
  | "logout"
  | "menu"
  | "close"
  | "search"
  | "bell"
  | "mail";

type OneRole = "Administrador" | "BackOffice" | "Comercial";

type CurrentOneUser = {
  id: string;
  name: string;
  email: string;
  role: OneRole;
  profile_type?: string | null;
  department?: string | null;
};

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  roles: OneRole[];
};

const ALL: OneRole[] = ["Administrador", "BackOffice", "Comercial"];
const ADMIN: OneRole[] = ["Administrador"];
const ADMIN_BO: OneRole[] = ["Administrador", "BackOffice"];
const ADMIN_COMMERCIAL: OneRole[] = ["Administrador", "Comercial"];

const primaryNavigation: NavItem[] = [
  { href: "/dashboard", label: "Mi Día", icon: "home", roles: ALL },
  { href: "/clientes", label: "Clientes", icon: "clients", roles: ALL },
  {
    href: "/comercial/oportunidades",
    label: "Mis ofertas",
    icon: "target",
    roles: ADMIN_COMMERCIAL,
  },
  {
    href: "/backoffice",
    label: "Tramitaciones",
    icon: "operations",
    roles: ADMIN_BO,
  },
  {
    href: "/contratos",
    label: "Contratos",
    icon: "operations",
    roles: ADMIN_BO,
  },
  {
    href: "/comercial/contratos",
    label: "Mis contratos",
    icon: "operations",
    roles: ["Comercial"],
  },
  {
    href: "/oportunidades",
    label: "Ofertas",
    icon: "target",
    roles: ADMIN_BO,
  },
  { href: "/agenda", label: "Agenda", icon: "calendar", roles: ALL },
  { href: "/correo", label: "Correo", icon: "mail", roles: ALL },
];

const managementNavigation: NavItem[] = [
  {
    href: "/productos",
    label: "Productos y Proveedores",
    icon: "products",
    roles: ADMIN,
  },
  {
    href: "/documentos",
    label: "Biblioteca",
    icon: "documents",
    roles: ALL,
  },
  {
    href: "/configuracion",
    label: "Campañas y Novedades",
    icon: "bell",
    roles: ADMIN,
  },
  {
    href: "/usuarios",
    label: "Usuarios y Permisos",
    icon: "team",
    roles: ADMIN,
  },
  {
    href: "/configuracion/plantillas-contractuales",
    label: "Plantillas contractuales",
    icon: "documents",
    roles: ADMIN,
  },
  {
    href: "/informes",
    label: "Informes",
    icon: "reports",
    roles: ADMIN_BO,
  },
  {
    href: "/configuracion",
    label: "Automatizaciones",
    icon: "settings",
    roles: ADMIN,
  },
];

function Icon({ name }: { name: IconName }) {
  const commonProps = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "home":
      return (
        <svg {...commonProps}>
          <path d="m3 11 9-8 9 8" />
          <path d="M5 10v10h14V10" />
          <path d="M9 20v-6h6v6" />
        </svg>
      );

    case "clients":
      return (
        <svg {...commonProps}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );

    case "target":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1" />
        </svg>
      );

    case "calendar":
      return (
        <svg {...commonProps}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </svg>
      );

    case "products":
      return (
        <svg {...commonProps}>
          <path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Z" />
          <path d="m4 12 8 4.5 8-4.5" />
          <path d="m4 16.5 8 4.5 8-4.5" />
        </svg>
      );

    case "team":
      return (
        <svg {...commonProps}>
          <circle cx="9" cy="8" r="4" />
          <path d="M3 21v-2a6 6 0 0 1 12 0v2" />
          <path d="M16 4.5a4 4 0 0 1 0 7" />
          <path d="M18 15a5 5 0 0 1 3 4.6V21" />
        </svg>
      );

    case "operations":
      return (
        <svg {...commonProps}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 8h8M8 12h8M8 16h5" />
          <path d="m15.5 16.5 1.5 1.5 3-3" />
        </svg>
      );

    case "documents":
      return (
        <svg {...commonProps}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6M8 13h8M8 17h6" />
        </svg>
      );

    case "reports":
      return (
        <svg {...commonProps}>
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
      );

    case "settings":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2.83 2.83-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21h-4v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06-2.83-2.83.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3v-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06 2.83-2.83.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3h4v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06 2.83 2.83-.06.06A1.65 1.65 0 0 0 19.4 9c.12.6.6 1.05 1.2 1.15H21v4h-.4A1.65 1.65 0 0 0 19.4 15Z" />
        </svg>
      );

    case "logout":
      return (
        <svg {...commonProps}>
          <path d="M10 17l5-5-5-5M15 12H3" />
          <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
        </svg>
      );

    case "menu":
      return (
        <svg {...commonProps}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );

    case "close":
      return (
        <svg {...commonProps}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      );

    case "search":
      return (
        <svg {...commonProps}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
      );

    case "bell":
      return (
        <svg {...commonProps}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
      );

    case "mail":
      return (
        <svg {...commonProps}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      );
  }
}

function NavigationGroup({
  title,
  items,
  pathname,
  onNavigate,
  role,
}: {
  title?: string;
  items: NavItem[];
  pathname: string;
  onNavigate: () => void;
  role: OneRole;
}) {
  return (
    <div className={styles.navigationGroup}>
      {title && <p className={styles.navigationTitle}>{title}</p>}

      <nav className={styles.navigation}>
        {items.filter((item) => item.roles.includes(role)).map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" &&
              pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={`${styles.navItem} ${
                isActive ? styles.navItemActive : ""
              }`}
              onClick={onNavigate}
            >
              <span className={styles.navIcon}>
                <Icon name={item.icon} />
              </span>

              <span>{item.label}</span>

              {isActive && <span className={styles.activeIndicator} />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentOneUser | null>(null);
  const [accessLoading, setAccessLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const {
          data: { session },
        } = await supabaseBrowser.auth.getSession();

        if (!session) {
          router.replace("/login");
          return;
        }

        const response = await fetch("/api/current-one-user", {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
          await supabaseBrowser.auth.signOut();
          router.replace("/login");
          return;
        }

        if (!cancelled) {
          setCurrentUser(data.user);
        }
      } catch {
        if (!cancelled) {
          router.replace("/login");
        }
      } finally {
        if (!cancelled) {
          setAccessLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!currentUser) return;

    const role = currentUser.role;

    const allowed = [...primaryNavigation, ...managementNavigation]
      .filter((item) => item.roles.includes(role))
      .some(
        (item) =>
          pathname === item.href ||
          (item.href !== "/dashboard" &&
            pathname.startsWith(`${item.href}/`))
      );

    // Rutas de creación/ficha permitidas por contexto.
    const contextualAllowed =
      pathname.startsWith("/clientes/") ||
      pathname.startsWith("/contratos/") ||
      (role !== "Comercial" && pathname.startsWith("/backoffice/")) ||
      (role === "Administrador" && pathname.startsWith("/usuarios/")) ||
      (role === "Administrador" && pathname.startsWith("/configuracion/")) ||
      ((role === "Administrador" || role === "Comercial") &&
        (pathname === "/oportunidades/nuevo" ||
          pathname.startsWith("/oportunidades/nuevo/") ||
          /^\/oportunidades\/[^/]+$/.test(pathname) ||
          pathname === "/operaciones/nueva"));

    if (!allowed && !contextualAllowed) {
      router.replace("/dashboard");
    }
  }, [currentUser, pathname, router]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  if (accessLoading || !currentUser) {
    return (
      <div style={{ padding: 32, fontFamily: "Arial, sans-serif" }}>
        Cargando acceso ONE...
      </div>
    );
  }

  const role = currentUser.role;

  async function logout() {
    await supabaseBrowser.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className={styles.shell}>
      <button
        type="button"
        className={`${styles.overlay} ${
          sidebarOpen ? styles.overlayVisible : ""
        }`}
        aria-label="Cerrar menú"
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        className={`${styles.sidebar} ${
          sidebarOpen ? styles.sidebarOpen : ""
        }`}
      >
        <div className={styles.sidebarHeader}>
          <Link
            href="/dashboard"
            className={styles.brand}
            onClick={() => setSidebarOpen(false)}
          >
            <span className={styles.brandLogo}>
              <img
                src="/brand/one-icon.svg"
                alt="ONE"
                className={styles.brandLogoImage}
              />
            </span>

            <span className={styles.brandText}>
              <strong>ONE</strong>
              <small>Tu negocio, siempre contigo.</small>
            </span>
          </Link>

          <button
            type="button"
            className={styles.closeButton}
            aria-label="Cerrar menú"
            onClick={() => setSidebarOpen(false)}
          >
            <Icon name="close" />
          </button>
        </div>

        <div className={styles.sidebarBody}>
          <NavigationGroup
            items={primaryNavigation}
            pathname={pathname}
            onNavigate={() => setSidebarOpen(false)}
            role={role}
          />

          <NavigationGroup
            title="Gestión"
            items={managementNavigation}
            pathname={pathname}
            onNavigate={() => setSidebarOpen(false)}
            role={role}
          />

        </div>

        <div className={styles.sidebarFooter}>
          <div className={styles.account}>
            <div className={styles.avatar}>
              {(currentUser.name || currentUser.email || "O").charAt(0).toUpperCase()}
            </div>

            <div className={styles.accountText}>
              <strong>{currentUser.name || "Mi cuenta"}</strong>
              <span>{role}</span>
            </div>

            <button
              type="button"
              className={styles.logoutButton}
              aria-label="Cerrar sesión"
              onClick={logout}
            >
              <Icon name="logout" />
            </button>
          </div>

          <div className={styles.version}>
            <span className={styles.statusDot} />
            <span>ONE Cloud</span>
            <small>v0.5</small>
          </div>
        </div>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              type="button"
              className={styles.menuButton}
              aria-label="Abrir menú"
              onClick={() => setSidebarOpen(true)}
            >
              <Icon name="menu" />
            </button>

            <div>
              <p className={styles.topbarEyebrow}>ONE</p>
              <strong className={styles.topbarTitle}>
                Tu negocio, siempre contigo.
              </strong>
            </div>
          </div>

          <div className={styles.topbarActions}>
            <GlobalSearch triggerClassName={styles.actionButton} />

            <ProactiveCenter triggerClassName={styles.actionButton} />

            <div className={styles.topbarAccount}>
              <span className={styles.topbarAvatar}>
                {(currentUser.name || currentUser.email || "O").charAt(0).toUpperCase()}
              </span>

              <div>
                <strong>{currentUser.name || "Mi cuenta"}</strong>
                <small>{role}</small>
              </div>
            </div>
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}