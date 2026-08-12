"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import styles from "./AppShell.module.css";

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
  | "bell";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
};

const primaryNavigation: NavItem[] = [
  { href: "/dashboard", label: "Mi Día", icon: "home" },
  { href: "/clientes", label: "Clientes", icon: "clients" },
  { href: "/operaciones", label: "Operaciones", icon: "operations" },
  { href: "/oportunidades", label: "Oportunidades", icon: "target" },
  { href: "/agenda", label: "Agenda", icon: "calendar" },
];

const managementNavigation: NavItem[] = [
  { href: "/productos", label: "Productos y Proveedores", icon: "products" },
  { href: "/documentos", label: "Biblioteca", icon: "documents" },
  { href: "/configuracion", label: "Campañas y Novedades", icon: "bell" },
  { href: "/comerciales", label: "Usuarios y Permisos", icon: "team" },
  { href: "/informes", label: "Informes", icon: "reports" },
  { href: "/configuracion", label: "Automatizaciones", icon: "settings" },
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
  }
}

function NavigationGroup({
  title,
  items,
  pathname,
  onNavigate,
}: {
  title?: string;
  items: NavItem[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div className={styles.navigationGroup}>
      {title && <p className={styles.navigationTitle}>{title}</p>}

      <nav className={styles.navigation}>
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" &&
              pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

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
          />

          <NavigationGroup
            title="Gestión"
            items={managementNavigation}
            pathname={pathname}
            onNavigate={() => setSidebarOpen(false)}
          />

        </div>

        <div className={styles.sidebarFooter}>
          <div className={styles.account}>
            <div className={styles.avatar}>O</div>

            <div className={styles.accountText}>
              <strong>Mi cuenta</strong>
              <span>ONE Cloud</span>
            </div>

            <Link
              href="/login"
              className={styles.logoutButton}
              aria-label="Cerrar sesión"
            >
              <Icon name="logout" />
            </Link>
          </div>

          <div className={styles.version}>
            <span className={styles.statusDot} />
            <span>ONE Cloud</span>
            <small>v0.3</small>
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
            <button
              type="button"
              className={styles.actionButton}
              aria-label="Buscar"
            >
              <Icon name="search" />
            </button>

            <button
              type="button"
              className={styles.actionButton}
              aria-label="Notificaciones"
            >
              <Icon name="bell" />
              <span className={styles.notificationDot} />
            </button>

            <div className={styles.topbarAccount}>
              <span className={styles.topbarAvatar}>O</span>

              <div>
                <strong>Mi cuenta</strong>
                <small>Administrador</small>
              </div>
            </div>
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}