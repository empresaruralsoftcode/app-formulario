'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Entrevista } from '@/lib/types';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const router = useRouter();
  const [entrevistas, setEntrevistas] = useState<Entrevista[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchEntrevistas();
  }, []);

  async function fetchEntrevistas() {
    const { data, error } = await supabase
      .from('entrevistas')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setEntrevistas(data);
    }
    setLoading(false);
  }

  async function createNewEntrevista() {
    const { data, error } = await supabase
      .from('entrevistas')
      .insert({
        fecha_diligenciamiento: new Date().toISOString().split('T')[0],
        asunto: '',
        estado: 'borrador',
      })
      .select()
      .single();

    if (!error && data) {
      router.push(`/entrevista/${data.id}`);
    }
  }

  const filtered = entrevistas.filter(e =>
    (e.asunto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.elaborado_por || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logoSmall}>
            <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="12" fill="url(#g1)" />
              <path d="M14 24C14 18.477 18.477 14 24 14V14C29.523 14 34 18.477 34 24V34H24C18.477 34 14 29.523 14 24V24Z" fill="white" fillOpacity="0.9"/>
              <defs><linearGradient id="g1" x1="0" y1="0" x2="48" y2="48"><stop stopColor="#00366b"/><stop offset="1" stopColor="#1b4d89"/></linearGradient></defs>
            </svg>
          </div>
          <span className={styles.sidebarTitle}>Comisaría</span>
        </div>

        <nav className={styles.nav}>
          <a className={`${styles.navItem} ${styles.navActive}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Panel de Casos
          </a>
          <a className={styles.navItem} onClick={() => createNewEntrevista()} style={{ cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nueva Entrevista
          </a>
        </nav>

        <div className={styles.sidebarFooter}>
          <p className={styles.userLabel}>Trabajo Social</p>
          <p className={styles.userName}>Geidy D. Hurtado M.</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1 className="headline-lg">Panel de Casos</h1>
            <p className={styles.headerSub}>Gestión de entrevistas de trabajo social</p>
          </div>
          <button className="btn btn-primary" onClick={createNewEntrevista}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nueva Entrevista
          </button>
        </header>

        {/* Stats */}
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{entrevistas.length}</span>
            <span className={styles.statLabel}>Total Entrevistas</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{entrevistas.filter(e => e.estado === 'borrador').length}</span>
            <span className={styles.statLabel}>Borradores</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{entrevistas.filter(e => e.estado === 'completado').length}</span>
            <span className={styles.statLabel}>Completadas</span>
          </div>
        </div>

        {/* Search */}
        <div className={styles.searchBar}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--outline)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            className={styles.searchInput}
            placeholder="Buscar por asunto o profesional..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className={styles.loadingWrap}><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--outline-variant)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            <h3>No hay entrevistas aún</h3>
            <p>Cree una nueva entrevista para comenzar</p>
            <button className="btn btn-primary" onClick={createNewEntrevista} style={{ marginTop: '1rem' }}>
              Crear Primera Entrevista
            </button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Asunto</th>
                <th>Elaborado por</th>
                <th>Estado</th>
                <th>Reporte</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr 
                  key={e.id} 
                  onClick={() => {
                    if (e.estado === 'completado') router.push(`/entrevista/${e.id}/resumen`);
                    else router.push(`/entrevista/${e.id}`);
                  }} 
                  style={{ cursor: 'pointer' }}
                >
                  <td>{e.fecha_diligenciamiento}</td>
                  <td>{e.asunto || <span style={{ color: 'var(--outline)' }}>Sin asunto</span>}</td>
                  <td>{e.elaborado_por}</td>
                  <td>
                    <span className={`badge ${e.estado === 'completado' ? 'badge-completed' : 'badge-draft'}`}>
                      {e.estado === 'completado' ? 'Completado' : 'Borrador'}
                    </span>
                  </td>
                  <td>
                    {e.estado === 'completado' && (
                      <button 
                        className="btn btn-tertiary" 
                        onClick={(ev) => { ev.stopPropagation(); router.push(`/entrevista/${e.id}/resumen`); }}
                        title="Ver PDF"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                      </button>
                    )}
                  </td>
                  <td>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--outline)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}
