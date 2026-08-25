"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import styles from "./login.module.css";

function homeForRole(role?: string | null) {
  if (role === "BackOffice") return "/dashboard";
  if (role === "Comercial") return "/dashboard";
  return "/dashboard";
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Introduce correo y contraseña.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: signInError } =
        await supabaseBrowser.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (signInError || !data.session) {
        throw new Error(signInError?.message || "No se pudo iniciar sesión.");
      }

      const response = await fetch("/api/current-one-user", {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
        },
      });

      const current = await response.json();

      if (!response.ok || !current.ok) {
        await supabaseBrowser.auth.signOut();
        throw new Error(
          current.error || "Este usuario no tiene acceso activo a ONE."
        );
      }

      router.replace(homeForRole(current.user.role));
      router.refresh();
    } catch (e: any) {
      setError(
        e?.message === "Invalid login credentials"
          ? "Correo o contraseña incorrectos."
          : e?.message || "No se pudo iniciar sesión."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.brandPanel}>
        <div className={styles.brandContent}>
          <div className={styles.logoContainer}>
            <Image
              src="/brand/one-logo.svg"
              alt="ONE"
              width={230}
              height={90}
              priority
              className={styles.logo}
            />
          </div>

          <div className={styles.brandMessage}>
            <span className={styles.eyebrow}>ONE BUSINESS PLATFORM</span>

            <h1>
              Todo tu negocio
              <br />
              en un solo lugar
            </h1>

            <p>
              Cada usuario entra en su propia operativa: comercial,
              BackOffice o administración.
            </p>
          </div>

          <div className={styles.brandFooter}>
            <span>ONE</span>
            <span className={styles.separator} />
            <span>Tu negocio. Más claro.</span>
          </div>
        </div>

        <div className={styles.gradientOrbOne} />
        <div className={styles.gradientOrbTwo} />
        <div className={styles.grid} />
      </section>

      <section className={styles.loginPanel}>
        <div className={styles.mobileLogo}>
          <Image
            src="/brand/one-logo.svg"
            alt="ONE"
            width={170}
            height={65}
            priority
          />
        </div>

        <div className={styles.loginCard}>
          <div className={styles.heading}>
            <span className={styles.eyebrow}>ACCESO ONE</span>
            <h2>Bienvenido</h2>
            <p>Accede con el usuario creado en Usuarios y Permisos.</p>
          </div>

          <form onSubmit={submit}>
            <label>
              Correo electrónico
              <div className={styles.inputWrap}>
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                />
              </div>
            </label>

            <label>
              Contraseña
              <div className={styles.inputWrap}>
                <input
                  type="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </label>

            {error && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "#fff2ee",
                  color: "#a64025",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className={styles.loginButton}
              disabled={loading}
              style={{ width: "100%", border: 0 }}
            >
              <span>{loading ? "Entrando..." : "Entrar en ONE"}</span>

              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path
                  d="m9 6 6 6-6 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </form>

          <div className={styles.security}>
            <div>
              <strong>Acceso por perfil</strong>
              <p>ONE adapta menú y operativa al rol del usuario.</p>
            </div>
          </div>
        </div>

        <p className={styles.copyright}>
          © {new Date().getFullYear()} ONE. Todos los derechos reservados.
        </p>
      </section>
    </main>
  );
}
