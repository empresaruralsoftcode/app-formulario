'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import * as T from '@/lib/types';
import styles from './resumen.module.css';

const GenogramaEditor = dynamic(() => import('@/components/GenogramaEditor'), { ssr: false });

function calculateAge(birthDate?: string): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const now = new Date();
  if (isNaN(birth.getTime())) return null;
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : 0;
}

function ObservationNote({ fieldName, observations }: { fieldName: string, observations: any }) {
  const obs = observations?.[fieldName];
  if (!obs || !obs.active || !obs.note) return null;
  return (
    <div style={{ marginTop: '0.25rem', marginBottom: '0.5rem', padding: '0.5rem', background: '#f9f9f9', borderLeft: '3px solid #2e7d32', fontSize: '0.9rem', color: '#555', fontStyle: 'italic', pageBreakInside: 'avoid' }}>
      <strong>Observación técnica:</strong> {obs.note}
    </div>
  );
}

export default function ResumenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [entrevista, setEntrevista] = useState<Partial<T.Entrevista>>({});
  const [datosNNA, setDatosNNA] = useState<Partial<T.DatosNNA>>({});
  const [datosAgresor, setDatosAgresor] = useState<Partial<T.DatosAgresor>>({});
  const [condiciones, setCondiciones] = useState<Partial<T.CondicionesHabitacionales>>({});
  const [integrantes, setIntegrantes] = useState<Partial<T.IntegranteHogar>[]>([]);
  const [dinamica, setDinamica] = useState<Partial<T.DinamicaFamiliar>>({});
  const [vulnerabilidad, setVulnerabilidad] = useState<Partial<T.VulnerabilidadEntorno>>({});
  const [cuidador, setCuidador] = useState<Partial<T.InformacionCuidador>>({});
  const [analisis, setAnalisis] = useState<Partial<T.AnalisisSocial>>({});
  const [tituloInforme, setTituloInforme] = useState('INFORME SOCIAL INICIAL PARA LA VERIFICACIÓN DE DERECHOS EN SITUACIÓN DE ABUSO SEXUAL- (ABS)');

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    const { data: ent } = await supabase.from('entrevistas').select('*').eq('id', id).single();
    if (ent) setEntrevista(ent);

    const { data: nna } = await supabase.from('datos_nna').select('*').eq('entrevista_id', id).single();
    if (nna) setDatosNNA(nna);

    const { data: agre } = await supabase.from('datos_agresor').select('*').eq('entrevista_id', id).single();
    if (agre) setDatosAgresor(agre);

    const { data: cond } = await supabase.from('condiciones_habitacionales').select('*').eq('entrevista_id', id).single();
    if (cond) setCondiciones(cond);

    const { data: intg } = await supabase.from('integrantes_hogar').select('*').eq('entrevista_id', id).order('orden');
    if (intg) setIntegrantes(intg);

    const { data: din } = await supabase.from('dinamica_familiar').select('*').eq('entrevista_id', id).single();
    if (din) setDinamica(din);

    const { data: vuln } = await supabase.from('vulnerabilidad_entorno').select('*').eq('entrevista_id', id).single();
    if (vuln) setVulnerabilidad(vuln);

    const { data: cuid } = await supabase.from('informacion_cuidador').select('*').eq('entrevista_id', id).single();
    if (cuid) setCuidador(cuid);

    const { data: anal } = await supabase.from('analisis_social').select('*').eq('entrevista_id', id).single();
    if (anal) setAnalisis(anal);

    setLoading(false);
  }

  function handlePrint() {
    window.print();
  }

  async function handleEdit() {
    const { error } = await supabase.from('entrevistas').update({ estado: 'borrador' }).eq('id', id);
    if (!error) {
      router.push(`/entrevista/${id}`);
    } else {
      alert('Error al habilitar edición');
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><div className="spinner" /></div>;

  return (
    <div className={styles.layout}>
      {/* Top Actions (hidden during print) */}
      <div className={styles.topActions}>
        <button className="btn btn-secondary" onClick={() => router.push('/dashboard')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          Volver
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary" onClick={handleEdit}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
          Habilitar Edición
        </button>
        <button className="btn btn-primary" onClick={handlePrint}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
          Exportar PDF
        </button>
      </div>

      {/* Printable Document */}
      <div className={styles.document}>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
          <thead className="print-header">
            <tr>
              <td style={{ padding: 0 }}>
                {/* Editable Header Section */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', border: '1.5px dashed var(--outline-variant)', minHeight: '120px', marginBottom: '1.5rem', fontFamily: 'Arial, sans-serif', background: '#fff' }}>
                  {/* Left Block: Logos */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', padding: '10px', borderRight: '1.5px dashed var(--outline-variant)' }}>
                    <img src="/escudo.png" alt="Escudo Municipio de Morales" style={{ height: '80px', objectFit: 'contain' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    <img src="/logo-pdet.png" alt="Logo PDET" style={{ height: '80px', objectFit: 'contain' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  </div>

                  {/* Center Block: Title */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px', textAlign: 'center' }}>
                    <h4 style={{ margin: 0, fontWeight: 500, color: '#333', fontSize: '1rem', lineHeight: '1.4' }}>ALCALDÍA MUNICIPAL<br />NIT: 891500982-6</h4>
                    <h2 style={{ color: '#2e7d32', margin: '15px 0 0 0', textTransform: 'uppercase', fontSize: '1.5rem', fontWeight: 800 }}>INFORME TRABAJO SOCIAL</h2>
                  </div>

                  {/* Right Block: Metadata */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px', padding: '10px 15px', borderLeft: '1.5px dashed var(--outline-variant)', fontSize: '0.85rem', color: '#555' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Fecha:</span> <span>junio de 2024</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Versión:</span> <span>11</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Página:</span> <span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; de &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Cód:</span> <span>F-PM-096</span></div>
                  </div>
                </div>
              </td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: 0 }}>

                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                  <textarea
                    className="print-textarea"
                    value={tituloInforme}
                    onChange={(e) => setTituloInforme(e.target.value)}
                    style={{
                      width: '100%',
                      textAlign: 'center',
                      fontSize: '1.25rem',
                      fontWeight: 'bold',
                      border: '1px solid transparent',
                      resize: 'none',
                      outline: 'none',
                      overflow: 'hidden',
                      minHeight: '40px',
                      fontFamily: 'inherit',
                      textTransform: 'uppercase'
                    }}
                    onFocus={(e) => e.target.style.border = '1px dashed #ccc'}
                    onBlur={(e) => e.target.style.border = '1px solid transparent'}
                    onInput={(e) => {
                      e.currentTarget.style.height = 'auto';
                      e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                    }}
                  />
                </div>

                <section className={styles.section}>
                  <h3 className={styles.sectionTitle}>1. Información de Control</h3>
                  <div className={styles.grid2}>
                    <div><strong>Elaborado por:</strong> {entrevista.elaborado_por} <ObservationNote fieldName="elaborado_por" observations={entrevista.observaciones_campos} /> </div>
                    <div><strong>Tarjeta Profesional:</strong> {entrevista.tarjeta_profesional} <ObservationNote fieldName="tarjeta_profesional" observations={entrevista.observaciones_campos} /></div>
                    <div><strong>Dirigido a:</strong> {entrevista.dirigido_a} <ObservationNote fieldName="dirigido_a" observations={entrevista.observaciones_campos} /></div>
                    <div style={{ gridColumn: '1 / -1' }}><strong>Asunto:</strong> {entrevista.asunto} <ObservationNote fieldName="asunto" observations={entrevista.observaciones_campos} /></div>
                  </div>
                </section>

                <section className={styles.section}>
                  <h3 className={styles.sectionTitle}>2. Datos del NNA</h3>
                  <div className={styles.grid2}>
                    <div><strong>Nombres:</strong> {datosNNA.nombres} {datosNNA.apellidos} <ObservationNote fieldName="nna_nombres" observations={entrevista.observaciones_campos} /></div>
                    <div><strong>Identificación:</strong> {datosNNA.tipo_documento} {datosNNA.numero_documento} <ObservationNote fieldName="nna_num_doc" observations={entrevista.observaciones_campos} /></div>
                    <div><strong>Fecha Nacimiento:</strong> {datosNNA.fecha_nacimiento} ({datosNNA.edad} años) <ObservationNote fieldName="nna_fecha_nac" observations={entrevista.observaciones_campos} /></div>
                    <div><strong>Sexo:</strong> {datosNNA.sexo} <ObservationNote fieldName="nna_sexo" observations={entrevista.observaciones_campos} /></div>
                    <div><strong>Nacionalidad:</strong> {datosNNA.nacionalidad} <ObservationNote fieldName="nna_nacionalidad" observations={entrevista.observaciones_campos} /></div>
                    <div><strong>Ubicación:</strong> {datosNNA.municipio}, {datosNNA.departamento} ({datosNNA.vereda}) <ObservationNote fieldName="nna_departamento" observations={entrevista.observaciones_campos} /></div>
                    <div><strong>Educación:</strong> {datosNNA.institucion_educativa} - Grado {datosNNA.grado} <ObservationNote fieldName="nna_ie" observations={entrevista.observaciones_campos} /></div>
                    <div><strong>Celular Acudiente:</strong> {datosNNA.celular_acudiente} <ObservationNote fieldName="nna_celular" observations={entrevista.observaciones_campos} /></div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <strong>Discapacidad:</strong> {datosNNA.tiene_discapacidad ? `Sí (${(datosNNA.categorias_discapacidad as string[] ?? []).join(', ')})` : 'No'}
                      <ObservationNote fieldName="nna_tiene_discapacidad" observations={entrevista.observaciones_campos} />
                    </div>
                    <div>
                      <strong>Grupo Étnico:</strong> {datosNNA.grupo_etnico} 
                      {(datosNNA.grupo_etnico && datosNNA.grupo_etnico.startsWith('Indígena')) && (
                        <span> ({datosNNA.pueblo_indigena || 'N/A'} - {datosNNA.resguardo || 'N/A'})</span>
                      )}
                      <ObservationNote fieldName="nna_grupo_etnico" observations={entrevista.observaciones_campos} />
                    </div>
                  </div>
                </section>

                <section className={styles.section}>
                  <h3 className={styles.sectionTitle}>4. Metodología e Instrumentos Utilizados</h3>
                  {(() => {
                    let items: { instrumento: string, descripcion: string }[] = [];
                    try {
                      const parsed = JSON.parse(analisis.metodologia_instrumentos || '[]');
                      if (Array.isArray(parsed)) items = parsed;
                    } catch { }

                    if (items.length === 0) return <p>Sin información registrada.</p>;

                    return (
                      <>
                        <table className={styles.table} style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
                          <thead>
                            <tr>
                              <th style={{ width: '30%' }}>Instrumento</th>
                              <th>Descripción / Aplicación</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item, i) => (
                              <tr key={i}>
                                <td style={{ verticalAlign: 'top' }}><strong>{item.instrumento}</strong></td>
                                <td>{item.descripcion}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <ObservationNote fieldName="analisis_metodologia" observations={entrevista.observaciones_campos} />
                      </>
                    );
                  })()}
                </section>

                <section className={styles.section}>
                  <h3 className={styles.sectionTitle}>5. Datos del Presunto agresor</h3>
                  <div className={styles.grid2}>
                    <div><strong>Nombre:</strong> {datosAgresor.nombre} <ObservationNote fieldName="agresor_nombre" observations={entrevista.observaciones_campos} /></div>
                    <div><strong>Edad:</strong> {datosAgresor.edad} <ObservationNote fieldName="agresor_edad" observations={entrevista.observaciones_campos} /></div>
                    <div><strong>Lugar de residencia:</strong> {datosAgresor.lugar_residencia} <ObservationNote fieldName="agresor_lugar_residencia" observations={entrevista.observaciones_campos} /></div>
                    <div><strong>Ocupación:</strong> {datosAgresor.ocupacion} <ObservationNote fieldName="agresor_ocupacion" observations={entrevista.observaciones_campos} /></div>
                    <div><strong>Grupo Poblacional:</strong> {datosAgresor.grupo_poblacional_enfoque_diferencial} <ObservationNote fieldName="agresor_grupo_poblacional" observations={entrevista.observaciones_campos} /></div>
                    <div><strong>Parentesco:</strong> {datosAgresor.parentesco} <ObservationNote fieldName="agresor_parentesco" observations={entrevista.observaciones_campos} /></div>
                  </div>
                </section>

                <section className={styles.section}>
                  <h3 className={styles.sectionTitle}>6. Condiciones Habitacionales y de Salud</h3>
                  <div className={styles.grid2}>
                    <div><strong>Lugar de Descanso:</strong> {condiciones.lugar_descanso} <ObservationNote fieldName="cond_lugar_descanso" observations={entrevista.observaciones_campos} /></div>
                    <div><strong>Duerme con adultos (Hab.):</strong> {condiciones.duerme_con_adultos_habitacion ? 'Sí' : 'No'} <ObservationNote fieldName="cond_duerme_adultos_hab" observations={entrevista.observaciones_campos} /></div>
                    <div><strong>Duerme con adultos (Cama):</strong> {condiciones.duerme_con_adultos_cama ? 'Sí' : 'No'} <ObservationNote fieldName="cond_duerme_adultos_cama" observations={entrevista.observaciones_campos} /></div>
                    <div><strong>Salud:</strong> {condiciones.afiliacion_salud} | EPS: {condiciones.eps || 'N/A'} <ObservationNote fieldName="cond_afiliacion_salud" observations={entrevista.observaciones_campos} /></div>
                    <div><strong>Vacunación Completa:</strong> {condiciones.vacunacion_completa ? 'Sí' : 'No'} <ObservationNote fieldName="cond_vacunacion_completa" observations={entrevista.observaciones_campos} /></div>
                    <div><strong>Nutrición:</strong> Comidas al día: {condiciones.comidas_al_dia} <ObservationNote fieldName="cond_comidas_dia" observations={entrevista.observaciones_campos} /></div>
                  </div>
                </section>

                <section className={styles.section}>
                  <h3 className={styles.sectionTitle}>7. Estructura Familiar (Integrantes del Hogar)</h3>
                  {integrantes.length === 0 ? (
                    <p className={styles.emptyText}>No se registraron integrantes.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Nombre</th>
                            <th>Parentesco</th>
                            <th>Documento</th>
                            <th>Edad/Nac</th>
                            <th>Actividad</th>
                            <th>Contacto</th>
                            <th>Salud</th>
                          </tr>
                        </thead>
                        <tbody>
                          {integrantes.map((ig, index) => (
                            <tr key={index}>
                              <td>{ig.nombre}</td>
                              <td>{ig.parentesco}</td>
                              <td>{ig.numero_documento}</td>
                              <td>{ig.fecha_nacimiento} ({ig.edad} años)</td>
                              <td>{ig.actividad_principal}</td>
                              <td>{ig.contacto}</td>
                              <td>{ig.eps} - {ig.regimen_salud}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className={styles.grid2} style={{ marginTop: 'var(--space-6)' }}>
                    <div><strong>Criterio Liderazgo:</strong> {dinamica.criterio_liderazgo} <ObservationNote fieldName="din_liderazgo" observations={entrevista.observaciones_campos} /></div>
                    <div><strong>Vínculo Más Fuerte:</strong> {dinamica.vinculo_afectivo_fuerte} <ObservationNote fieldName="din_vinculo" observations={entrevista.observaciones_campos} /></div>
                    <div style={{ gridColumn: '1 / -1' }}><strong>Actividades Familiares:</strong> {(dinamica.actividades_familiares as string[] ?? []).join(', ')} <ObservationNote fieldName="din_actividades" observations={entrevista.observaciones_campos} /></div>
                    <div style={{ gridColumn: '1 / -1' }}><strong>Métodos de Corrección:</strong> {(dinamica.metodos_correccion as string[] ?? []).join(', ')} (Aplica: {dinamica.quien_corrige}) <ObservationNote fieldName="din_metodos" observations={entrevista.observaciones_campos} /></div>
                  </div>

                  {entrevista.genograma_data && (entrevista.genograma_data.nodes?.length > 0) && (
                    <div style={{ marginTop: 'var(--space-6)', pageBreakInside: 'avoid' }}>
                      <h4 style={{ marginBottom: 'var(--space-3)', color: 'var(--on-surface-variant)' }}>Genograma</h4>
                      <div style={{ border: '1px solid var(--outline-variant)', borderRadius: '8px', overflow: 'hidden', minHeight: '400px' }}>
                        {entrevista.genograma_data.imagen_base64 ? (
                          <img src={entrevista.genograma_data.imagen_base64} alt="Genograma" style={{ width: '100%', height: 'auto', display: 'block' }} />
                        ) : (
                          <div style={{ height: '400px' }}>
                            <GenogramaEditor
                              initialNodes={entrevista.genograma_data.nodes}
                              initialEdges={entrevista.genograma_data.edges}
                              readOnly={true}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </section>

                <section className={styles.section}>
                  <h3 className={styles.sectionTitle}>8. Entorno Social y Redes de Apoyo</h3>
                  <div className={styles.grid2}>
                    <div style={{ gridColumn: '1 / -1' }}><strong>Eventos de Violencia:</strong> {(vulnerabilidad.eventos_violencia as string[] ?? []).join(', ')} <ObservationNote fieldName="vuln_eventos" observations={entrevista.observaciones_campos} /></div>
                    <div style={{ gridColumn: '1 / -1' }}><strong>Redes de Apoyo:</strong> {(vulnerabilidad.redes_apoyo as string[] ?? []).join(', ')} <ObservationNote fieldName="vuln_redes" observations={entrevista.observaciones_campos} /></div>
                    <div><strong>Ubicación Vivienda:</strong> {vulnerabilidad.ubicacion_vivienda} <ObservationNote fieldName="vuln_ubicacion" observations={entrevista.observaciones_campos} /></div>
                    <div><strong>Tipo Vivienda:</strong> {vulnerabilidad.tipo_vivienda} <ObservationNote fieldName="vuln_tipo" observations={entrevista.observaciones_campos} /></div>
                  </div>
                </section>

                <section className={styles.section}>
                  <h3 className={styles.sectionTitle}>9. Información del Cuidador</h3>
                  <div className={styles.grid2}>
                    <div><strong>Nombre:</strong> {cuidador.nombre} <ObservationNote fieldName="cuid_nombre" observations={entrevista.observaciones_campos} /></div>
                    <div><strong>Parentesco:</strong> {cuidador.parentesco_tipo} <ObservationNote fieldName="cuid_parentesco" observations={entrevista.observaciones_campos} /></div>
                    <div><strong>Edad:</strong> {cuidador.edad} <ObservationNote fieldName="cuid_edad" observations={entrevista.observaciones_campos} /></div>
                    <div><strong>Actividad:</strong> {cuidador.actividad_principal} <ObservationNote fieldName="cuid_actividad" observations={entrevista.observaciones_campos} /></div>
                    <div><strong>¿NNA queda solo?:</strong> {cuidador.nna_queda_solo ? `Sí (${cuidador.tiempo_solo})` : 'No'} <ObservationNote fieldName="cuid_queda_solo" observations={entrevista.observaciones_campos} /></div>
                  </div>
                </section>

                <section className={styles.section}>
                  <h3 className={styles.sectionTitle}>10. Análisis Social y Conclusiones</h3>

                  <div className={styles.textBlock}>
                    <h4>10.1 Manifestaciones o situación actual del NNA</h4>
                    <p style={{ textAlign: 'justify' }}>{analisis.manifestaciones_nna || 'Sin información registrada.'}</p>
                    <ObservationNote fieldName="analisis_manifestaciones" observations={entrevista.observaciones_campos} />
                  </div>

                  <div className={styles.textBlock}>
                    <h4>10.2 Matriz de Vulneración de Derechos Identificados</h4>
                    {(() => {
                      let items: any[] = [];
                      try {
                        const parsed = JSON.parse(analisis.matriz_vulneracion_derechos || '[]');
                        if (Array.isArray(parsed)) items = parsed;
                      } catch { }

                      if (items.length === 0) return <p>Sin información registrada.</p>;

                      return (
                        <div className="table-responsive">
                          <table className={styles.table} style={{ marginTop: '0.5rem', marginBottom: '1rem', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#2e7d32', color: 'white' }}>
                                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Derecho</th>
                                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Situación evidenciada</th>
                                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Tipo de afectación</th>
                                <th style={{ border: '1px solid #ccc', padding: '8px', width: '15%' }}>Riesgo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((item, i) => (
                                <tr key={i}>
                                  <td style={{ border: '1px solid #ccc', padding: '8px', verticalAlign: 'top' }}><strong>{item.derecho}</strong></td>
                                  <td style={{ border: '1px solid #ccc', padding: '8px', verticalAlign: 'top' }}>{item.situacion}</td>
                                  <td style={{ border: '1px solid #ccc', padding: '8px', verticalAlign: 'top' }}>{item.afectacion}</td>
                                  <td style={{ border: '1px solid #ccc', padding: '8px', verticalAlign: 'top', textAlign: 'center' }}>{item.riesgo}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <ObservationNote fieldName="analisis_matriz" observations={entrevista.observaciones_campos} />
                        </div>
                      );
                    })()}
                  </div>

                  <div className={styles.textBlock}>
                    <h4>10.3 Factores de Riesgo</h4>
                    <p style={{ textAlign: 'justify' }}>{analisis.factores_riesgo || 'Sin información registrada.'}</p>
                    <ObservationNote fieldName="analisis_riesgo" observations={entrevista.observaciones_campos} />
                  </div>

                  <div className={styles.textBlock}>
                    <h4>10.4 Generatividad</h4>
                    <p style={{ textAlign: 'justify' }}>{analisis.generatividad || 'Sin información registrada.'}</p>
                    <ObservationNote fieldName="analisis_generatividad" observations={entrevista.observaciones_campos} />
                  </div>

                  <div className={styles.textBlock}>
                    <h4>10.5 Análisis Social</h4>
                    <p style={{ textAlign: 'justify' }}>{analisis.analisis_social || 'Sin información registrada.'}</p>
                    <ObservationNote fieldName="analisis_social" observations={entrevista.observaciones_campos} />
                  </div>

                  <div className={styles.textBlock}>
                    <h4>10.6 Recomendaciones Técnicas</h4>
                    {analisis.recomendaciones && analisis.recomendaciones.length > 0 ? (
                      <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                        {(analisis.recomendaciones as string[]).map((rec, i) => (
                          <li key={i} style={{ marginBottom: '0.5rem', textAlign: 'justify' }}>{rec}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>Sin información registrada.</p>
                    )}
                    <ObservationNote fieldName="analisis_recomendaciones" observations={entrevista.observaciones_campos} />
                  </div>
                </section>

                {entrevista.anexos_fotograficos && entrevista.anexos_fotograficos.length > 0 && (
                  <section className={styles.section} style={{ pageBreakInside: 'avoid' }}>
                    <h3 className={styles.sectionTitle}>11. Anexos Fotográficos</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                      {entrevista.anexos_fotograficos.map((anexo, idx) => {
                        const url = typeof anexo === 'string' ? anexo : anexo?.url;
                        const desc = typeof anexo === 'string' ? '' : (anexo?.descripcion || '');
                        if (!url) return null;
                        return (
                          <div key={idx} style={{ textAlign: 'center' }}>
                            <img src={url} alt={`Anexo fotográfico ${idx + 1}`} style={{ width: '100%', maxHeight: '350px', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--outline-variant)' }} />
                            <p style={{ marginTop: '0.5rem', fontSize: '1rem', color: 'var(--on-surface-variant)', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
                              {desc || ''}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                <div className={styles.signatures}>
                  <div className={styles.signatureLine}>
                    <span>Firma Profesional Responsable</span>
                    <strong>{entrevista.elaborado_por}</strong>
                    <small>Trabajo Social - TP: {entrevista.tarjeta_profesional}</small>
                  </div>
                </div>

              </td>
            </tr>
          </tbody>
          <tfoot className="print-footer">
            <tr>
              <td style={{ padding: 0 }}>
                {/* Visual Footer (Repeats on each printed page) */}
                <div style={{ position: 'relative', width: '100%', height: '140px', marginTop: '20px', overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>
                  {/* Diagonal Dotted Line */}
                  <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }} preserveAspectRatio="none" viewBox="0 0 1000 140">
                    {/* Línea inferior continua (debajo de todo) */}
                    <path d="M 0,135 L 1000,135" fill="none" stroke="#888" strokeWidth="2" strokeDasharray="5,5" vectorEffect="non-scaling-stroke" />
                    {/* Línea de doble escalón basada en el trazado rojo */}
                    <path d="M 320,135 L 390,90 L 620,90 L 690,25 L 1000,25" fill="none" stroke="#888" strokeWidth="2" strokeDasharray="5,5" vectorEffect="non-scaling-stroke" />
                  </svg>

                  <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1, height: '100%' }}>
                    {/* Left Block: Contact Info */}
                    <div style={{ width: '65%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', paddingTop: '20px', gap: '8px', color: '#888', fontSize: '11pt' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                        <span>Línea de atención ciudadana: 310 738 4060</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" /></svg>
                        <span>Dirección: Calle 4 No. 1 - 10 Edificio CAM</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                        <span>contactenos@morales-cauca.gov.co</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                        <span>www.morales-cauca.gov.co</span>
                      </div>
                    </div>

                    {/* Right Block: Socials */}
                    <div style={{ width: '35%', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '40px' }}>
                      <strong style={{ color: '#888', fontSize: '13pt', marginBottom: '8px' }}>AlcaldíaMoralesCauca</strong>
                      <div style={{ display: 'flex', gap: '8px' }}>

                        {/* Facebook */}
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                          <circle cx="20" cy="20" r="18" fill="#a3c68c" />
                          <g transform="translate(8, 8)">
                            <path d="M16 2h-3a5 5 0 0 0-5 5v3H5v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" fill="white" />
                          </g>
                        </svg>

                        {/* Instagram */}
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                          <circle cx="20" cy="20" r="18" fill="#a3c68c" />
                          <g transform="translate(8, 8)">
                            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
                            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                          </g>
                        </svg>

                        {/* X (Twitter) */}
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                          <circle cx="20" cy="20" r="18" fill="#a3c68c" />
                          <g transform="translate(8, 8)">
                            <path d="M 5 5 L 19 19 M 19 5 L 5 19" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                          </g>
                        </svg>

                        {/* YouTube */}
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                          <circle cx="20" cy="20" r="18" fill="#a3c68c" />
                          <g transform="translate(8, 8)">
                            <rect x="2" y="5" width="20" height="14" rx="3" ry="3" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <polygon points="10 9 15 12 10 15 10 9" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="18.5" cy="16.5" r="1.5" fill="white" stroke="none" />
                          </g>
                        </svg>

                      </div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
