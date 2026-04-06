'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // For this internal tool, proceed directly to dashboard
    setTimeout(() => {
      router.push('/dashboard');
    }, 600);
  };

  return (
    <div className={styles.container}>
      <div className={styles.leftPanel}>
        <div className={styles.brandContent}>
          <div className={styles.logoMark}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="12" fill="url(#grad)" />
              <path d="M14 24C14 18.477 18.477 14 24 14V14C29.523 14 34 18.477 34 24V34H24C18.477 34 14 29.523 14 24V24Z" fill="white" fillOpacity="0.9"/>
              <path d="M20 24C20 21.791 21.791 20 24 20V20C26.209 20 28 21.791 28 24V28H24C21.791 28 20 26.209 20 24V24Z" fill="url(#grad2)"/>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="48" y2="48">
                  <stop stopColor="#00366b"/>
                  <stop offset="1" stopColor="#1b4d89"/>
                </linearGradient>
                <linearGradient id="grad2" x1="20" y1="20" x2="28" y2="28">
                  <stop stopColor="#00366b"/>
                  <stop offset="1" stopColor="#1b4d89"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className={styles.brandTitle}>Comisaría<br/>de Familia</h1>
          <p className={styles.brandSubtitle}>
            Sistema de Entrevistas<br/>de Trabajo Social
          </p>
          <div className={styles.decorLine} />
          <p className={styles.brandCaption}>
            Plataforma de recolección y gestión de datos para el bienestar de niños, niñas y adolescentes.
          </p>
        </div>
      </div>

      <div className={styles.rightPanel}>
        <div className={styles.loginCard}>
          <div className={styles.loginHeader}>
            <h2>Bienvenido</h2>
            <p>Ingrese sus credenciales para continuar</p>
          </div>

          <form onSubmit={handleLogin} className={styles.loginForm}>
            <div className="input-group">
              <label htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                className="input-field"
                placeholder="correo@comisaria.gov.co"
                defaultValue="admin@comisaria.gov.co"
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                className="input-field"
                placeholder="••••••••"
                defaultValue="password"
              />
            </div>

            <button type="submit" className={`btn btn-primary ${styles.loginBtn}`} disabled={loading}>
              {loading ? (
                <span className={styles.btnSpinner}></span>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          <p className={styles.loginFooter}>
            Sección de Trabajo Social — Comisaría de Familia
          </p>
        </div>
      </div>
    </div>
  );
}
