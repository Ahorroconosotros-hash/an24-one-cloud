import Image from "next/image";
import Link from "next/link";
import styles from "./login.module.css";

export default function LoginPage() {
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
              Clientes, oportunidades, agenda, documentos y actividad
              comercial conectados en una única plataforma.
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
            <span className={styles.welcomeLabel}>BIENVENIDO</span>
            <h2>Entra en ONE</h2>
            <p>Accede a tu espacio de trabajo.</p>
          </div>

          <form className={styles.form}>
            <label className={styles.field}>
              <span>Correo electrónico</span>

              <div className={styles.inputWrapper}>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className={styles.inputIcon}
                >
                  <path
                    d="M4 6.5h16v11H4v-11Zm0 .5 8 6 8-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <input
                  type="email"
                  name="email"
                  placeholder="nombre@empresa.com"
                  autoComplete="email"
                />
              </div>
            </label>

            <label className={styles.field}>
              <div className={styles.passwordHeading}>
                <span>Contraseña</span>
                <button type="button">¿La has olvidado?</button>
              </div>

              <div className={styles.inputWrapper}>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className={styles.inputIcon}
                >
                  <path
                    d="M7 10V8a5 5 0 0 1 10 0v2M6 10h12v10H6V10Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <input
                  type="password"
                  name="password"
                  placeholder="Introduce tu contraseña"
                  autoComplete="current-password"
                />
              </div>
            </label>

            <Link href="/dashboard" className={styles.loginButton}>
              <span>Entrar en ONE</span>

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
            </Link>
          </form>

          <div className={styles.security}>
            <span className={styles.securityIcon}>
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path
                  d="M12 3 5 6v5c0 4.8 2.9 8.2 7 10 4.1-1.8 7-5.2 7-10V6l-7-3Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <path
                  d="m9 12 2 2 4-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>

            <div>
              <strong>Acceso seguro</strong>
              <p>Tus datos están protegidos.</p>
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