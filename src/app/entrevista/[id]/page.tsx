'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import * as T from '@/lib/types';
import styles from './entrevista.module.css';

const GenogramaEditor = dynamic(() => import('@/components/GenogramaEditor'), { ssr: false });

const STEPS = [
  { id: 0, label: 'Información General', icon: '📋' },
  { id: 1, label: 'Datos del NNA', icon: '👶' },
  { id: 2, label: 'Condiciones y Salud', icon: '🏠' },
  { id: 3, label: 'Estructura Familiar', icon: '👨‍👩‍👧‍👦' },
  { id: 4, label: 'Vulnerabilidad', icon: '⚠️' },
  { id: 5, label: 'Cuidador', icon: '🤝' },
  { id: 6, label: 'Análisis Social', icon: '📝' },
  { id: 7, label: 'Anexos Fotográficos', icon: '📸' },
];

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

function ChipSelector({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const isOtroVariant = (opt: string) => opt.toLowerCase() === 'otro' || opt.toLowerCase() === 'otra';
  const getOtroString = () => selected.find(s => s.startsWith('Otro:') || s.startsWith('Otra:') || isOtroVariant(s));
  const hasOtro = getOtroString() !== undefined;

  const toggle = (opt: string) => {
    if (isOtroVariant(opt)) {
      const existing = getOtroString();
      if (existing) onChange(selected.filter(s => s !== existing));
      else onChange([...selected, `${opt}: `]);
    } else {
      if (selected.includes(opt)) onChange(selected.filter(s => s !== opt));
      else onChange([...selected, opt]);
    }
  };

  return (
    <div>
      <div className="radio-group" style={{ marginBottom: hasOtro ? 'var(--space-2)' : '0' }}>
        {options.map(opt => {
          const isSelected = isOtroVariant(opt) ? hasOtro : selected.includes(opt);
          return (
            <button key={opt} type="button" className={`chip ${isSelected ? 'chip-selected' : 'chip-unselected'}`} onClick={() => toggle(opt)}>
              {opt}
            </button>
          )
        })}
      </div>
      {hasOtro && (
        <input 
          className="input-field animate-slide-up" 
          placeholder={`¿Qué ${getOtroString()?.split(':')[0].toLowerCase() || 'otro'}? Especificar...`} 
          value={getOtroString()?.split(': ')?.[1] || ''}
          onChange={e => {
            const optBase = getOtroString()?.split(':')[0] || 'Otro';
            onChange([...selected.filter(s => s !== getOtroString()), `${optBase}: ${e.target.value}`]);
          }}
        />
      )}
    </div>
  );
}

function RadioGroupWithOtro({ options, value, onChange }: { options: string[]; value: string | null; onChange: (v: string | null) => void }) {
  const isOtroVariant = (opt: string) => opt.toLowerCase() === 'otro' || opt.toLowerCase() === 'otra';
  const isOtroSelected = value !== null && (isOtroVariant(value) || value.startsWith('Otro:') || value.startsWith('Otra:'));
  
  return (
    <div>
      <div className="radio-group" style={{ marginBottom: isOtroSelected ? 'var(--space-2)' : '0' }}>
        {options.map(opt => {
          const isSelected = isOtroVariant(opt) ? isOtroSelected : value === opt;
          return (
            <button key={opt} type="button" className={`chip ${isSelected ? 'chip-selected' : 'chip-unselected'}`} onClick={() => onChange(isOtroVariant(opt) ? `${opt}: ` : opt)}>
              {opt}
            </button>
          );
        })}
      </div>
      {isOtroSelected && (
        <input 
          className="input-field animate-slide-up" 
          placeholder={`Especifique...`} 
          value={value!.includes(': ') ? value!.split(': ')[1] : ''}
          onChange={e => {
            const optBase = value!.split(':')[0] || 'Otro';
            onChange(`${optBase}: ${e.target.value}`);
          }}
        />
      )}
    </div>
  );
}

function BooleanSelect({ value, onChange, label }: { value: boolean | null; onChange: (v: boolean | null) => void; label: string }) {
  return (
    <div className="input-group">
      <label>{label}</label>
      <div className="radio-group">
        <button type="button" className={`chip ${value === true ? 'chip-selected' : 'chip-unselected'}`} onClick={() => onChange(true)}>Sí</button>
        <button type="button" className={`chip ${value === false ? 'chip-selected' : 'chip-unselected'}`} onClick={() => onChange(false)}>No</button>
      </div>
    </div>
  );
}

export default function EntrevistaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form Data
  const [entrevista, setEntrevista] = useState<Partial<T.Entrevista>>({
    estado: 'borrador', elaborado_por: '', tarjeta_profesional: '', dirigido_a: '', asunto: '', anexos_fotograficos: [],
  });
  const [datosNNA, setDatosNNA] = useState<Partial<T.DatosNNA>>({
    pais_nacimiento: 'Colombia', nacionalidad: 'Colombiana', tiene_discapacidad: false,
    categorias_discapacidad: [], lenguas: [], sexo: '', tipo_documento: '', grupo_etnico: '',
    descripcion_discapacidad_otra: '', pueblo_indigena: '', resguardo: '',
  });
  const [condiciones, setCondiciones] = useState<Partial<T.CondicionesHabitacionales>>({
    lugar_descanso: '', afiliacion_salud: '', vacunacion_completa: null,
    duerme_con_adultos_habitacion: null, duerme_con_adultos_cama: null,
    recibe_leche_materna: null, atencion_odontologica: null, valoracion_desarrollo: null,
    comidas_al_dia: null, tipo_alimentacion: [], consume_frutas_verduras: null,
    consume_proteinas: null, consume_lacteos: null, consume_agua_suficiente: null,
    tiene_horario_alimentacion: null, observaciones_nutricion: '',
  });
  const [integrantes, setIntegrantes] = useState<Partial<T.IntegranteHogar>[]>([]);
  const [dinamica, setDinamica] = useState<Partial<T.DinamicaFamiliar>>({
    actividades_familiares: [], metodos_correccion: [], criterio_liderazgo: '', vinculo_afectivo_fuerte: '',
  });
  const [vulnerabilidad, setVulnerabilidad] = useState<Partial<T.VulnerabilidadEntorno>>({
    eventos_violencia: [], redes_apoyo: [], servicios_publicos: [], ubicacion_vivienda: '', tipo_vivienda: '',
  });
  const [cuidador, setCuidador] = useState<Partial<T.InformacionCuidador>>({
    estimulos_3_dias: [], reconocimiento: [], nna_queda_solo: null,
  });
  const [analisis, setAnalisis] = useState<Partial<T.AnalisisSocial>>({
    metodologia_instrumentos: '', manifestaciones_nna: '', matriz_vulneracion_derechos: '', factores_riesgo_generatividad: '', analisis_recomendaciones: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: ent } = await supabase.from('entrevistas').select('*').eq('id', id).single();
    if (ent) setEntrevista(ent);

    const { data: nna } = await supabase.from('datos_nna').select('*').eq('entrevista_id', id).single();
    if (nna) setDatosNNA(nna);

    const { data: cond } = await supabase.from('condiciones_habitacionales').select('*').eq('entrevista_id', id).single();
    if (cond) setCondiciones(cond);

    const { data: intg } = await supabase.from('integrantes_hogar').select('*').eq('entrevista_id', id).order('orden');
    if (intg && intg.length > 0) setIntegrantes(intg);

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

  function formatSupabaseError(err: any): string {
    if (!err) return 'Unknown error';
    if (typeof err === 'string') return err;
    const parts: string[] = [];
    if (err.message) parts.push(err.message);
    if (err.code) parts.push(`Code: ${err.code}`);
    if (err.details) parts.push(`Details: ${err.details}`);
    if (err.hint) parts.push(`Hint: ${err.hint}`);
    if (parts.length > 0) return parts.join(' | ');
    try {
      return JSON.stringify(err, Object.getOwnPropertyNames(err), 2);
    } catch {
      return String(err);
    }
  }

  async function saveCurrentStep() {
    if (saving) return false;
    if (!id) {
      console.error('No ID found in params');
      return false;
    }
    
    setSaving(true);
    
    try {
      // Step 0: General + Anexos
      if (step >= 0 || step === 7) {
        const payload = { ...entrevista, id };
        delete (payload as any).created_at;
        const { data: entData, error: entErr } = await supabase
          .from('entrevistas')
          .upsert(payload, { onConflict: 'id' })
          .select();
        if (entErr) {
          console.error('Error saving entrevista:', formatSupabaseError(entErr));
          throw new Error(`Error guardando información general: ${formatSupabaseError(entErr)}`);
        }
        if (entData && entData.length > 0) setEntrevista(entData[0]);
      }

      // Step 1: Datos NNA
      if (step >= 1) {
        const payload = { ...datosNNA, entrevista_id: id };
        delete (payload as any).created_at;
        const { data: nnaData, error: nnaErr } = await supabase
          .from('datos_nna')
          .upsert(payload, { onConflict: 'entrevista_id' })
          .select();
        if (nnaErr) {
          console.error('Error saving datos_nna:', formatSupabaseError(nnaErr));
          throw new Error(`Error guardando datos del NNA: ${formatSupabaseError(nnaErr)}`);
        }
        if (nnaData && nnaData.length > 0) setDatosNNA(nnaData[0]);
      }

      // Step 2: Condiciones Habitacionales
      if (step >= 2) {
        const payload = { ...condiciones, entrevista_id: id };
        delete (payload as any).created_at;
        
        // Convierto strings vacíos en null para evitar violaciones de CHECK constraints en BD
        (Object.keys(payload) as (keyof typeof payload)[]).forEach(k => {
          if (payload[k] === '') (payload[k] as any) = null;
        });

        const { data: condData, error: condErr } = await supabase
          .from('condiciones_habitacionales')
          .upsert(payload, { onConflict: 'entrevista_id' })
          .select();
        if (condErr) {
          console.error('Error saving condiciones:', formatSupabaseError(condErr));
          throw new Error(`Error guardando condiciones: ${formatSupabaseError(condErr)}`);
        }
        if (condData && condData.length > 0) setCondiciones(condData[0]);
      }

      // Step 3: Integrantes + Dinamica
      if (step >= 3) {
        const { error: delErr } = await supabase.from('integrantes_hogar').delete().eq('entrevista_id', id);
        if (delErr) {
          console.error('Error deleting integrantes:', formatSupabaseError(delErr));
          throw new Error(`Error eliminando integrantes: ${formatSupabaseError(delErr)}`);
        }

        if (integrantes.length > 0) {
          const intPayload = integrantes.map((ig, i) => {
            const d = { ...ig, entrevista_id: id, orden: i };
            delete (d as any).id; 
            delete (d as any).created_at;
            delete (d as any).edad;
            if (!d.fecha_nacimiento) d.fecha_nacimiento = null as any;
            if (!d.numero_documento) d.numero_documento = null as any;
            return d;
          });
          const { data: intData, error: intErr } = await supabase.from('integrantes_hogar').insert(intPayload).select();
          if (intErr) {
            console.error('Error inserting integrantes:', formatSupabaseError(intErr));
            throw new Error(`Error insertando integrantes: ${formatSupabaseError(intErr)}`);
          }
          if (intData) setIntegrantes(intData);
        }
        
        const dinPayload = { ...dinamica, entrevista_id: id };
        delete (dinPayload as any).created_at;
        const { data: dinData, error: dinErr } = await supabase
          .from('dinamica_familiar')
          .upsert(dinPayload, { onConflict: 'entrevista_id' })
          .select();
        if (dinErr) {
          console.error('Error saving dinamica:', formatSupabaseError(dinErr));
          throw new Error(`Error guardando dinámica familiar: ${formatSupabaseError(dinErr)}`);
        }
        if (dinData && dinData.length > 0) setDinamica(dinData[0]);
      }

      // Step 4: Vulnerabilidad
      if (step >= 4) {
        const payload = { ...vulnerabilidad, entrevista_id: id };
        delete (payload as any).created_at;
        const { data: vulnData, error: vulnErr } = await supabase
          .from('vulnerabilidad_entorno')
          .upsert(payload, { onConflict: 'entrevista_id' })
          .select();
        if (vulnErr) {
          console.error('Error saving vulnerabilidad:', formatSupabaseError(vulnErr));
          throw new Error(`Error guardando vulnerabilidad: ${formatSupabaseError(vulnErr)}`);
        }
        if (vulnData && vulnData.length > 0) setVulnerabilidad(vulnData[0]);
      }

      // Step 5: Cuidador
      if (step >= 5) {
        const payload = { ...cuidador, entrevista_id: id };
        delete (payload as any).created_at;
        const { data: cuidData, error: cuidErr } = await supabase
          .from('informacion_cuidador')
          .upsert(payload, { onConflict: 'entrevista_id' })
          .select();
        if (cuidErr) {
          console.error('Error saving cuidador:', formatSupabaseError(cuidErr));
          throw new Error(`Error guardando cuidador: ${formatSupabaseError(cuidErr)}`);
        }
        if (cuidData && cuidData.length > 0) setCuidador(cuidData[0]);
      }

      // Step 6: Analisis
      if (step >= 6) {
        const payload = { ...analisis, entrevista_id: id };
        delete (payload as any).created_at;
        const { data: analData, error: analErr } = await supabase
          .from('analisis_social')
          .upsert(payload, { onConflict: 'entrevista_id' })
          .select();
        if (analErr) {
          console.error('Error saving analisis:', formatSupabaseError(analErr));
          throw new Error(`Error guardando análisis: ${formatSupabaseError(analErr)}`);
        }
        if (analData && analData.length > 0) setAnalisis(analData[0]);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setSaving(false);
      return true;
    } catch (err: any) {
      console.error('Save failed:', err);
      const detail = err.message || formatSupabaseError(err);
      alert(`Error al guardar: ${detail}`);
      setSaving(false);
      return false;
    }
  }

  async function finishEntrevista() {
    const success = await saveCurrentStep();
    if (success) {
      await supabase.from('entrevistas').update({ estado: 'completado' }).eq('id', id);
      const { data: ent } = await supabase.from('entrevistas').select('*').eq('id', id).single();
      if (ent) setEntrevista(ent);
      router.push('/dashboard');
    }
  }

  async function handleUnlock() {
    const { error } = await supabase.from('entrevistas').update({ estado: 'borrador' }).eq('id', id);
    if (!error) {
      const { data: ent } = await supabase.from('entrevistas').select('*').eq('id', id).single();
      if (ent) setEntrevista(ent);
    } else {
      alert('Error al habilitar edición');
    }
  }

  function addIntegrante() {
    setIntegrantes([...integrantes, {
      entrevista_id: id, nombre: '', parentesco: '', tipo_documento: '', numero_documento: '',
      fecha_nacimiento: '', edad: null, sexo: '', genero: '', orientacion_sexual: '', grupo_etnico: '',
      nivel_escolaridad: '', actividad_principal: '', ingresos: null, orden: integrantes.length,
    }]);
  }

  function updateIntegrante(index: number, field: string, value: string | number | null) {
    const updated = [...integrantes];
    (updated[index] as Record<string, unknown>)[field] = value;
    
    if (field === 'fecha_nacimiento') {
      updated[index].edad = calculateAge(value as string);
    }
    
    setIntegrantes(updated);
  }

  function removeIntegrante(index: number) {
    setIntegrantes(integrantes.filter((_, i) => i !== index));
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><div className="spinner" /></div>;

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <button className={styles.backBtn} onClick={() => router.push('/dashboard')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Volver al panel
          </button>
          <h2 className={styles.sidebarHeading}>Entrevista</h2>
          <div className="stepper-track" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="stepper-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <nav className={styles.stepperNav}>
          {STEPS.map(s => (
            <button key={s.id} className={`stepper-step ${s.id === step ? 'active' : ''} ${s.id < step ? 'completed' : ''}`} onClick={() => { saveCurrentStep(); setStep(s.id); }}>
              <span className={`stepper-dot ${s.id === step ? 'active' : s.id < step ? 'completed' : 'pending'}`}>
                {s.id < step ? '✓' : s.id + 1}
              </span>
              <span>{s.label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.sidebarActions}>
          {saved && <span className={styles.savedLabel}>✓ Guardado</span>}
          <button className="btn btn-secondary" onClick={saveCurrentStep} disabled={saving} style={{ width: '100%' }}>
            {saving ? 'Guardando...' : 'Guardar Progreso'}
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        {entrevista.estado === 'completado' && (
          <div className={styles.completedBanner}>
            <div className={styles.bannerContent}>
              <div className={styles.bannerIcon}>✓</div>
              <div className={styles.bannerText}>
                <h3>Entrevista Finalizada</h3>
                <p>Este registro está marcado como completado y listo para exportación.</p>
              </div>
            </div>
            <div className={styles.bannerActions} style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button className="btn btn-primary" onClick={() => router.push(`/entrevista/${id}/resumen`)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Generar PDF Profesional
              </button>
              <button className="btn btn-secondary" onClick={handleUnlock}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                Habilitar Edición
              </button>
            </div>
          </div>
        )}

        {step === 0 && (
          <div className="animate-slide-up">
            <h2 className={styles.stepTitle}>Información de Control e Identificación</h2>
            <div className="form-section">
              <div className="form-row">
                <div className="input-group">
                  <label>Fecha de Diligenciamiento</label>
                  <input type="date" className="input-field" value={entrevista.fecha_diligenciamiento || ''} onChange={e => setEntrevista({ ...entrevista, fecha_diligenciamiento: e.target.value })} />
                </div>
                <div className="input-group">
                  <label>Elaborado por</label>
                  <input className="input-field" value={entrevista.elaborado_por || ''} onChange={e => setEntrevista({ ...entrevista, elaborado_por: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="input-group">
                  <label>Tarjeta Profesional</label>
                  <input className="input-field" value={entrevista.tarjeta_profesional || ''} onChange={e => setEntrevista({ ...entrevista, tarjeta_profesional: e.target.value })} />
                </div>
                <div className="input-group">
                  <label>Dirigido a</label>
                  <input className="input-field" value={entrevista.dirigido_a || ''} onChange={e => setEntrevista({ ...entrevista, dirigido_a: e.target.value })} />
                </div>
              </div>
              <div className="input-group">
                <label>Asunto (Descripción del Caso)</label>
                <textarea className="input-field" rows={4} value={entrevista.asunto || ''} onChange={e => setEntrevista({ ...entrevista, asunto: e.target.value })} placeholder="Describa el asunto de la entrevista..." />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="animate-slide-up">
            <h2 className={styles.stepTitle}>Datos del Niño, Niña o Adolescente</h2>
            <div className="form-section">
              <h3 className="form-section-title">Identificación</h3>
              <div className="form-row">
                <div className="input-group"><label>Nombres</label><input className="input-field" value={datosNNA.nombres || ''} onChange={e => setDatosNNA({...datosNNA, nombres: e.target.value})} /></div>
                <div className="input-group"><label>Apellidos</label><input className="input-field" value={datosNNA.apellidos || ''} onChange={e => setDatosNNA({...datosNNA, apellidos: e.target.value})} /></div>
              </div>
              <div className="form-row">
                <div className="input-group"><label>Fecha de Nacimiento</label><input type="date" className="input-field" value={datosNNA.fecha_nacimiento || ''} onChange={e => {
                  const dob = e.target.value;
                  const age = calculateAge(dob);
                  setDatosNNA({...datosNNA, fecha_nacimiento: dob, edad: age});
                }} /></div>
                <div className="input-group"><label>Edad</label><input type="number" className="input-field" value={datosNNA.edad ?? ''} onChange={e => setDatosNNA({...datosNNA, edad: e.target.value ? Number(e.target.value) : null})} /></div>
              </div>
              <div className="form-row">
                <div className="input-group">
                  <label>Tipo de Documento</label>
                  <select className="input-field" value={datosNNA.tipo_documento || ''} onChange={e => setDatosNNA({...datosNNA, tipo_documento: e.target.value})}>
                    <option value="">Seleccione...</option>
                    {T.TIPOS_DOCUMENTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="input-group"><label>Número de Documento</label><input className="input-field" value={datosNNA.numero_documento || ''} onChange={e => setDatosNNA({...datosNNA, numero_documento: e.target.value})} /></div>
              </div>
              <div className="input-group" style={{ marginTop: 'var(--space-4)' }}>
                <label>Sexo</label>
                <div className="radio-group">
                  {T.SEXOS.map(s => <button key={s.value} type="button" className={`chip ${datosNNA.sexo === s.value ? 'chip-selected' : 'chip-unselected'}`} onClick={() => setDatosNNA({...datosNNA, sexo: s.value})}>{s.label}</button>)}
                </div>
              </div>
            </div>
            <div className="form-section">
              <h3 className="form-section-title">Ubicación</h3>
              <div className="form-row">
                <div className="input-group"><label>País de Nacimiento</label><input className="input-field" value={datosNNA.pais_nacimiento || ''} onChange={e => setDatosNNA({...datosNNA, pais_nacimiento: e.target.value})} /></div>
                <div className="input-group"><label>Nacionalidad</label><input className="input-field" value={datosNNA.nacionalidad || ''} onChange={e => setDatosNNA({...datosNNA, nacionalidad: e.target.value})} /></div>
              </div>
              <div className="form-row">
                <div className="input-group"><label>Departamento</label><input className="input-field" value={datosNNA.departamento || ''} onChange={e => setDatosNNA({...datosNNA, departamento: e.target.value})} /></div>
                <div className="input-group"><label>Municipio</label><input className="input-field" value={datosNNA.municipio || ''} onChange={e => setDatosNNA({...datosNNA, municipio: e.target.value})} /></div>
                <div className="input-group"><label>Vereda</label><input className="input-field" value={datosNNA.vereda || ''} onChange={e => setDatosNNA({...datosNNA, vereda: e.target.value})} /></div>
              </div>
              <div className="input-group"><label>Celular del Acudiente</label><input className="input-field" value={datosNNA.celular_acudiente || ''} onChange={e => setDatosNNA({...datosNNA, celular_acudiente: e.target.value})} /></div>
            </div>
            <div className="form-section">
              <h3 className="form-section-title">Educación</h3>
              <div className="form-row">
                <div className="input-group"><label>Institución Educativa</label><input className="input-field" value={datosNNA.institucion_educativa || ''} onChange={e => setDatosNNA({...datosNNA, institucion_educativa: e.target.value})} /></div>
                <div className="input-group"><label>Grado</label><input className="input-field" value={datosNNA.grado || ''} onChange={e => setDatosNNA({...datosNNA, grado: e.target.value})} /></div>
              </div>
            </div>
            <div className="form-section">
              <h3 className="form-section-title">Discapacidad</h3>
              <BooleanSelect label="¿Tiene discapacidad?" value={datosNNA.tiene_discapacidad ?? null} onChange={v => setDatosNNA({...datosNNA, tiene_discapacidad: v ?? false})} />
              {datosNNA.tiene_discapacidad && (
                <>
                  <div className="input-group" style={{ marginTop: 'var(--space-4)' }}>
                    <label>Categorías de Discapacidad</label>
                    <ChipSelector options={T.CATEGORIAS_DISCAPACIDAD} selected={datosNNA.categorias_discapacidad as string[] || []} onChange={v => setDatosNNA({...datosNNA, categorias_discapacidad: v})} />
                  </div>
                  {(datosNNA.categorias_discapacidad as string[] || []).includes('Otra') && (
                    <div className="input-group" style={{ marginTop: 'var(--space-4)' }}>
                      <label>Describa la discapacidad</label>
                      <textarea className="input-field" rows={3} value={datosNNA.descripcion_discapacidad_otra || ''} onChange={e => setDatosNNA({...datosNNA, descripcion_discapacidad_otra: e.target.value})} placeholder="Describa el tipo de discapacidad..." />
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="form-section">
              <h3 className="form-section-title">Grupo Étnico</h3>
              <RadioGroupWithOtro options={T.GRUPOS_ETNICOS} value={datosNNA.grupo_etnico || null} onChange={v => setDatosNNA({...datosNNA, grupo_etnico: v || ''})} />
              {datosNNA.grupo_etnico === 'Indígena' && (
                <div style={{ marginTop: 'var(--space-4)' }}>
                  <div className="input-group">
                    <label>Pueblo Indígena</label>
                    <RadioGroupWithOtro options={T.PUEBLOS_INDIGENAS} value={datosNNA.pueblo_indigena || null} onChange={v => setDatosNNA({...datosNNA, pueblo_indigena: v || ''})} />
                  </div>
                  <div className="input-group" style={{ marginTop: 'var(--space-4)' }}>
                    <label>Resguardo al que pertenece</label>
                    <input className="input-field" value={datosNNA.resguardo || ''} onChange={e => setDatosNNA({...datosNNA, resguardo: e.target.value})} placeholder="Nombre del resguardo..." />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-slide-up">
            <h2 className={styles.stepTitle}>Condiciones Habitacionales y de Salud</h2>
            <div className="form-section">
              <h3 className="form-section-title">Habitabilidad del NNA</h3>
              <div className="input-group">
                <label>Lugar de Descanso</label>
                <RadioGroupWithOtro options={T.LUGARES_DESCANSO} value={condiciones.lugar_descanso || null} onChange={v => setCondiciones({...condiciones, lugar_descanso: v || ''})} />
              </div>
              <div className="form-row" style={{ marginTop: 'var(--space-4)' }}>
                <BooleanSelect label="¿Duerme con adultos en la misma habitación?" value={condiciones.duerme_con_adultos_habitacion ?? null} onChange={v => setCondiciones({...condiciones, duerme_con_adultos_habitacion: v})} />
                <BooleanSelect label="¿Duerme con adultos en la misma cama?" value={condiciones.duerme_con_adultos_cama ?? null} onChange={v => setCondiciones({...condiciones, duerme_con_adultos_cama: v})} />
              </div>
            </div>
            <div className="form-section">
              <h3 className="form-section-title">Salud y Prevención</h3>
              <div className="form-row">
                <div className="input-group">
                  <label>Afiliación a Salud</label>
                  <div className="radio-group">
                    <button type="button" className={`chip ${condiciones.afiliacion_salud === 'afiliado' ? 'chip-selected' : 'chip-unselected'}`} onClick={() => setCondiciones({...condiciones, afiliacion_salud: 'afiliado'})}>Afiliado</button>
                    <button type="button" className={`chip ${condiciones.afiliacion_salud === 'no_afiliado' ? 'chip-selected' : 'chip-unselected'}`} onClick={() => setCondiciones({...condiciones, afiliacion_salud: 'no_afiliado'})}>No Afiliado</button>
                  </div>
                </div>
                <div className="input-group"><label>EPS</label><input className="input-field" value={condiciones.eps || ''} onChange={e => setCondiciones({...condiciones, eps: e.target.value})} /></div>
              </div>
              {condiciones.afiliacion_salud === 'no_afiliado' && (
                <div className="input-group" style={{ marginTop: 'var(--space-4)' }}>
                  <label>Motivo de No Afiliación</label>
                  <RadioGroupWithOtro options={T.MOTIVOS_NO_AFILIACION} value={condiciones.motivo_no_afiliacion || null} onChange={v => setCondiciones({...condiciones, motivo_no_afiliacion: v || ''})} />
                </div>
              )}
              <div className="form-row" style={{ marginTop: 'var(--space-4)' }}>
                <BooleanSelect label="Esquema de Vacunación Completo" value={condiciones.vacunacion_completa ?? null} onChange={v => setCondiciones({...condiciones, vacunacion_completa: v})} />
                <BooleanSelect label="Atención Odontológica" value={condiciones.atencion_odontologica ?? null} onChange={v => setCondiciones({...condiciones, atencion_odontologica: v})} />
                <BooleanSelect label="Valoración Integral del Desarrollo" value={condiciones.valoracion_desarrollo ?? null} onChange={v => setCondiciones({...condiciones, valoracion_desarrollo: v})} />
              </div>
            </div>
            <div className="form-section">
              <h3 className="form-section-title">Alimentación y Nutrición</h3>
              {(datosNNA.edad === null || datosNNA.edad === undefined || datosNNA.edad <= 2) && (
                <>
                  <BooleanSelect label="¿Recibe leche materna?" value={condiciones.recibe_leche_materna ?? null} onChange={v => setCondiciones({...condiciones, recibe_leche_materna: v})} />
                  {condiciones.recibe_leche_materna === false && (
                    <div className="input-group" style={{ marginTop: 'var(--space-4)' }}>
                      <label>Motivo de Suspensión</label>
                      <RadioGroupWithOtro options={T.MOTIVOS_SUSPENSION_LACTANCIA} value={condiciones.motivo_suspension_lactancia || null} onChange={v => setCondiciones({...condiciones, motivo_suspension_lactancia: v || ''})} />
                    </div>
                  )}
                  <div className="input-group" style={{ marginTop: 'var(--space-4)' }}>
                    <label>Edad de inicio de alimentación complementaria (meses)</label>
                    <input type="number" className="input-field" value={condiciones.edad_inicio_alimentacion ?? ''} onChange={e => setCondiciones({...condiciones, edad_inicio_alimentacion: e.target.value ? Number(e.target.value) : null})} />
                  </div>
                </>
              )}
              {datosNNA.edad != null && datosNNA.edad > 2 && (
                <>
                  <div className="form-row">
                    <div className="input-group">
                      <label>¿Cuántas comidas recibe al día?</label>
                      <input type="number" className="input-field" min={1} max={10} value={condiciones.comidas_al_dia ?? ''} onChange={e => setCondiciones({...condiciones, comidas_al_dia: e.target.value ? Number(e.target.value) : null})} placeholder="Ej: 3" />
                    </div>
                  </div>
                  <div className="input-group" style={{ marginTop: 'var(--space-4)' }}>
                    <label>¿Qué comidas recibe habitualmente?</label>
                    <ChipSelector options={T.TIPOS_ALIMENTACION} selected={condiciones.tipo_alimentacion as string[] || []} onChange={v => setCondiciones({...condiciones, tipo_alimentacion: v})} />
                  </div>
                  <div style={{ marginTop: 'var(--space-4)' }}>
                    <label className="label-lg" style={{ marginBottom: 'var(--space-3)', display: 'block' }}>Consumo de Grupos Alimenticios</label>
                    <div className="form-row">
                      <BooleanSelect label="¿Consume frutas y verduras regularmente?" value={condiciones.consume_frutas_verduras ?? null} onChange={v => setCondiciones({...condiciones, consume_frutas_verduras: v})} />
                      <BooleanSelect label="¿Consume proteínas (carne, huevo, legumbres)?" value={condiciones.consume_proteinas ?? null} onChange={v => setCondiciones({...condiciones, consume_proteinas: v})} />
                    </div>
                    <div className="form-row" style={{ marginTop: 'var(--space-3)' }}>
                      <BooleanSelect label="¿Consume lácteos (leche, queso, yogur)?" value={condiciones.consume_lacteos ?? null} onChange={v => setCondiciones({...condiciones, consume_lacteos: v})} />
                      <BooleanSelect label="¿Toma suficiente agua al día?" value={condiciones.consume_agua_suficiente ?? null} onChange={v => setCondiciones({...condiciones, consume_agua_suficiente: v})} />
                    </div>
                  </div>
                  <div className="form-row" style={{ marginTop: 'var(--space-4)' }}>
                    <BooleanSelect label="¿Tiene horarios regulares de alimentación?" value={condiciones.tiene_horario_alimentacion ?? null} onChange={v => setCondiciones({...condiciones, tiene_horario_alimentacion: v})} />
                  </div>
                  <div className="input-group" style={{ marginTop: 'var(--space-4)' }}>
                    <label>Observaciones sobre la nutrición del NNA</label>
                    <textarea className="input-field" rows={3} value={condiciones.observaciones_nutricion || ''} onChange={e => setCondiciones({...condiciones, observaciones_nutricion: e.target.value})} placeholder="Estado nutricional observado, señales de desnutrición, sobrepeso, etc." />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-slide-up">
            <h2 className={styles.stepTitle}>Estructura y Dinámica Familiar</h2>
            <div className="form-section">
              <h3 className="form-section-title">Integrantes del Hogar</h3>
              {integrantes.map((ig, i) => (
                <div key={i} className={styles.integranteCard}>
                  <div className={styles.integranteHeader}>
                    <span className="label-lg">Integrante {i + 1}</span>
                    <button type="button" className="btn btn-tertiary" onClick={() => removeIntegrante(i)} style={{ color: 'var(--error)', fontSize: '0.8125rem' }}>Eliminar</button>
                  </div>
                  <div className="form-row">
                    <div className="input-group"><label>Nombre</label><input className="input-field" value={ig.nombre || ''} onChange={e => updateIntegrante(i, 'nombre', e.target.value)} /></div>
                    <div className="input-group">
                      <label>Parentesco</label>
                      <select className="input-field" value={ig.parentesco || ''} onChange={e => updateIntegrante(i, 'parentesco', e.target.value)}>
                        <option value="">Seleccione...</option>
                        {T.PARENTESCOS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="input-group"><label>Documento</label><input className="input-field" value={ig.numero_documento || ''} onChange={e => updateIntegrante(i, 'numero_documento', e.target.value)} /></div>
                    <div className="input-group"><label>Fecha de Nacimiento</label><input type="date" className="input-field" value={ig.fecha_nacimiento || ''} onChange={e => updateIntegrante(i, 'fecha_nacimiento', e.target.value)} /></div>
                    <div className="input-group"><label>Edad</label><input type="number" className="input-field" value={ig.edad ?? ''} onChange={e => updateIntegrante(i, 'edad', e.target.value ? Number(e.target.value) : null)} /></div>
                    <div className="input-group">
                      <label>Sexo</label>
                      <select className="input-field" value={ig.sexo || ''} onChange={e => updateIntegrante(i, 'sexo', e.target.value)}>
                        <option value="">Seleccione...</option>
                        {T.SEXOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="input-group"><label>Nivel de Escolaridad</label><input className="input-field" value={ig.nivel_escolaridad || ''} onChange={e => updateIntegrante(i, 'nivel_escolaridad', e.target.value)} /></div>
                    <div className="input-group"><label>Actividad Principal</label><input className="input-field" value={ig.actividad_principal || ''} onChange={e => updateIntegrante(i, 'actividad_principal', e.target.value)} /></div>
                    <div className="input-group"><label>Ingresos</label><input type="number" className="input-field" value={ig.ingresos ?? ''} onChange={e => updateIntegrante(i, 'ingresos', e.target.value ? Number(e.target.value) : null)} /></div>
                  </div>
                  <div className="form-row">
                    <div className="input-group"><label>Estado Civil</label><input className="input-field" value={ig.estado_civil || ''} onChange={e => updateIntegrante(i, 'estado_civil', e.target.value)} placeholder="Ej: Soltero(a), Casado(a)" /></div>
                    <div className="input-group"><label>Contacto (Número de celular)</label><input className="input-field" type="tel" value={ig.contacto || ''} onChange={e => updateIntegrante(i, 'contacto', e.target.value)} placeholder="Ej: 3001234567" /></div>
                  </div>
                  <div className="form-row">
                    <div className="input-group"><label>EPS</label><input className="input-field" value={ig.eps || ''} onChange={e => updateIntegrante(i, 'eps', e.target.value)} placeholder="Ej: Sanitas, Sura..." /></div>
                    <div className="input-group">
                      <label>Régimen de Salud</label>
                      <select className="input-field" value={ig.regimen_salud || ''} onChange={e => updateIntegrante(i, 'regimen_salud', e.target.value)}>
                        <option value="">Seleccione...</option>
                        <option value="Subsidiado">Subsidiado</option>
                        <option value="Contributivo">Contributivo</option>
                        <option value="Especial/Excepción">Especial/Excepción</option>
                        <option value="No afiliado">No afiliado</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" className="btn btn-secondary" onClick={addIntegrante}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Agregar Integrante
              </button>
            </div>
            <div className="form-section">
              <h3 className="form-section-title">Dinámica Relacional</h3>
              <div className="input-group">
                <label>Criterio de Liderazgo Familiar</label>
                <RadioGroupWithOtro options={T.CRITERIOS_LIDERAZGO} value={dinamica.criterio_liderazgo || null} onChange={v => setDinamica({...dinamica, criterio_liderazgo: v || ''})} />
              </div>
              <div className="input-group" style={{ marginTop: 'var(--space-4)' }}>
                <label>Vínculo Afectivo Más Fuerte</label>
                <RadioGroupWithOtro options={T.VINCULOS_AFECTIVOS} value={dinamica.vinculo_afectivo_fuerte || null} onChange={v => setDinamica({...dinamica, vinculo_afectivo_fuerte: v || ''})} />
              </div>
              <div className="input-group" style={{ marginTop: 'var(--space-4)' }}>
                <label>Actividades Familiares</label>
                <ChipSelector options={T.ACTIVIDADES_FAMILIARES} selected={dinamica.actividades_familiares as string[] || []} onChange={v => setDinamica({...dinamica, actividades_familiares: v})} />
              </div>
              <div className="input-group" style={{ marginTop: 'var(--space-4)' }}>
                <label>Métodos de Corrección</label>
                <ChipSelector options={T.METODOS_CORRECCION} selected={dinamica.metodos_correccion as string[] || []} onChange={v => setDinamica({...dinamica, metodos_correccion: v})} />
              </div>
              <div className="input-group" style={{ marginTop: 'var(--space-4)' }}>
                <label>¿Quién Corrige?</label>
                <input className="input-field" value={dinamica.quien_corrige || ''} onChange={e => setDinamica({...dinamica, quien_corrige: e.target.value})} placeholder="Nombre o parentesco..." />
              </div>
            </div>
            <div className="form-section">
              <h3 className="form-section-title">Genograma Familiar</h3>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Utilice esta herramienta interactiva para construir el genograma familiar. Añada hombres (cuadrados) o mujeres (círculos), haga clic en ellos para editar su nombre, enfermedades u ocupación, y trace las relaciones conectando sus puntos. Ajuste los estilos de línea seleccionándola.
              </p>
              <div style={{ height: '600px', borderRadius: '8px', border: '1px solid var(--outline-variant)', overflow: 'hidden' }}>
                <GenogramaEditor 
                  initialNodes={entrevista.genograma_data?.nodes || []}
                  initialEdges={entrevista.genograma_data?.edges || []}
                  onChange={(nodes, edges, b64) => setEntrevista(prev => ({ 
                    ...prev, 
                    genograma_data: { 
                      nodes, 
                      edges, 
                      imagen_base64: b64 || prev.genograma_data?.imagen_base64 
                    } 
                  }))}
                />
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-slide-up">
            <h2 className={styles.stepTitle}>Vulnerabilidad y Entorno</h2>
            <div className="form-section">
              <h3 className="form-section-title">Eventos de Violencia en el Hogar</h3>
              <ChipSelector options={T.EVENTOS_VIOLENCIA} selected={vulnerabilidad.eventos_violencia as string[] || []} onChange={v => setVulnerabilidad({...vulnerabilidad, eventos_violencia: v})} />
            </div>
            <div className="form-section">
              <h3 className="form-section-title">Redes de Apoyo</h3>
              <ChipSelector options={T.REDES_APOYO} selected={vulnerabilidad.redes_apoyo as string[] || []} onChange={v => setVulnerabilidad({...vulnerabilidad, redes_apoyo: v})} />
            </div>
            <div className="form-section">
              <h3 className="form-section-title">Características de la Vivienda</h3>
              <div className="input-group">
                <label>Ubicación</label>
                <RadioGroupWithOtro options={T.UBICACIONES_VIVIENDA} value={vulnerabilidad.ubicacion_vivienda || null} onChange={v => setVulnerabilidad({...vulnerabilidad, ubicacion_vivienda: v || ''})} />
              </div>
              <div className="input-group" style={{ marginTop: 'var(--space-4)' }}>
                <label>Tipo de Vivienda</label>
                <RadioGroupWithOtro options={T.TIPOS_VIVIENDA} value={vulnerabilidad.tipo_vivienda || null} onChange={v => setVulnerabilidad({...vulnerabilidad, tipo_vivienda: v || ''})} />
              </div>
              <div className="input-group" style={{ marginTop: 'var(--space-4)' }}>
                <label>Servicios Públicos</label>
                <ChipSelector options={T.SERVICIOS_PUBLICOS} selected={vulnerabilidad.servicios_publicos as string[] || []} onChange={v => setVulnerabilidad({...vulnerabilidad, servicios_publicos: v})} />
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="animate-slide-up">
            <h2 className={styles.stepTitle}>Información del Cuidador e Interacción</h2>
            <div className="form-section">
              <h3 className="form-section-title">Perfil del Cuidador</h3>
              <div className="form-row">
                <div className="input-group"><label>Nombre</label><input className="input-field" value={cuidador.nombre || ''} onChange={e => setCuidador({...cuidador, nombre: e.target.value})} /></div>
                <div className="input-group">
                  <label>Tipo de Parentesco</label>
                  <div className="radio-group">
                    {T.PARENTESCOS_CUIDADOR.map(p => <button key={p} type="button" className={`chip ${cuidador.parentesco_tipo === p ? 'chip-selected' : 'chip-unselected'}`} onClick={() => setCuidador({...cuidador, parentesco_tipo: p})}>{p}</button>)}
                  </div>
                </div>
              </div>
              <div className="form-row">
                <div className="input-group"><label>Edad</label><input type="number" className="input-field" value={cuidador.edad ?? ''} onChange={e => setCuidador({...cuidador, edad: e.target.value ? Number(e.target.value) : null})} /></div>
                <div className="input-group"><label>Actividad Principal</label><input className="input-field" value={cuidador.actividad_principal || ''} onChange={e => setCuidador({...cuidador, actividad_principal: e.target.value})} /></div>
              </div>
            </div>
            <div className="form-section">
              <h3 className="form-section-title">Tiempo e Interacción</h3>
              <div className="form-row">
                <div className="input-group"><label>Horas diarias de cuidado</label><input type="number" className="input-field" value={cuidador.horas_cuidado_diario ?? ''} onChange={e => setCuidador({...cuidador, horas_cuidado_diario: e.target.value ? Number(e.target.value) : null})} /></div>
                <BooleanSelect label="¿El NNA queda solo?" value={cuidador.nna_queda_solo ?? null} onChange={v => setCuidador({...cuidador, nna_queda_solo: v})} />
              </div>
              {cuidador.nna_queda_solo && (
                <div className="input-group" style={{ marginTop: 'var(--space-4)' }}>
                  <label>¿Cuánto tiempo queda solo?</label>
                  <input className="input-field" value={cuidador.tiempo_solo || ''} onChange={e => setCuidador({...cuidador, tiempo_solo: e.target.value})} placeholder="Ej: 2 horas al día" />
                </div>
              )}
            </div>
            <div className="form-section">
              <h3 className="form-section-title">Actividades (últimos 3 días)</h3>
              <ChipSelector options={T.ESTIMULOS_3_DIAS} selected={cuidador.estimulos_3_dias as string[] || []} onChange={v => setCuidador({...cuidador, estimulos_3_dias: v})} />
            </div>
            <div className="form-section">
              <h3 className="form-section-title">Reconocimiento</h3>
              <ChipSelector options={T.RECONOCIMIENTOS} selected={cuidador.reconocimiento as string[] || []} onChange={v => setCuidador({...cuidador, reconocimiento: v})} />
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="animate-slide-up">
            <h2 className={styles.stepTitle}>Análisis Social y Conclusiones</h2>
            <div className="form-section">
              <h3 className="form-section-title">Metodología e Instrumentos Utilizados</h3>
              {(() => {
                let items: { instrumento: string, descripcion: string }[] = [];
                try {
                  const parsed = JSON.parse(analisis.metodologia_instrumentos || '[]');
                  if (Array.isArray(parsed)) items = parsed;
                } catch {}
                const updateRow = (index: number, field: 'instrumento' | 'descripcion', value: string) => {
                  const newItems = [...items];
                  newItems[index][field] = value;
                  setAnalisis({ ...analisis, metodologia_instrumentos: JSON.stringify(newItems) });
                };
                const removeRow = (index: number) => {
                  const newItems = items.filter((_, i) => i !== index);
                  setAnalisis({ ...analisis, metodologia_instrumentos: JSON.stringify(newItems) });
                };
                const addRow = () => {
                  const newItems = [...items, { instrumento: '', descripcion: '' }];
                  setAnalisis({ ...analisis, metodologia_instrumentos: JSON.stringify(newItems) });
                };
                return (
                  <div>
                    {items.length > 0 && (
                      <table className="data-table" style={{ marginTop: '0', width: '100%', marginBottom: '1rem' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '30%', fontSize: '0.875rem', color: 'var(--on-surface)' }}>Instrumentos aplicados</th>
                            <th style={{ fontSize: '0.875rem', color: 'var(--on-surface)' }}>Descripción</th>
                            <th style={{ width: '50px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, i) => (
                            <tr key={i}>
                              <td style={{ padding: '0', background: 'var(--surface-container-low)' }}>
                                <textarea className="input-field" style={{ minHeight: '80px', borderRadius: '0' }} placeholder="Ejem: Entrevista semi-estructurada" value={item.instrumento} onChange={e => updateRow(i, 'instrumento', e.target.value)} />
                              </td>
                              <td style={{ padding: '0' }}>
                                <textarea className="input-field" style={{ minHeight: '80px', borderRadius: '0' }} placeholder="Descripción..." value={item.descripcion} onChange={e => updateRow(i, 'descripcion', e.target.value)} />
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button type="button" onClick={() => removeRow(i)} className="btn btn-tertiary" style={{ color: 'var(--error)' }}>✕</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    <button type="button" onClick={addRow} className="btn btn-secondary">+ Agregar Instrumento</button>
                  </div>
                );
              })()}
            </div>
            <div className="form-section">
              <h3 className="form-section-title">Manifestaciones y Percepciones del NNA</h3>
              <textarea className="input-field" rows={5} value={analisis.manifestaciones_nna || ''} onChange={e => setAnalisis({...analisis, manifestaciones_nna: e.target.value})} placeholder="Describa las manifestaciones y percepciones observadas..." />
            </div>
            <div className="form-section">
              <h3 className="form-section-title">Matriz de Vulneración de Derechos</h3>
              <textarea className="input-field" rows={5} value={analisis.matriz_vulneracion_derechos || ''} onChange={e => setAnalisis({...analisis, matriz_vulneracion_derechos: e.target.value})} placeholder="Detalle la matriz de vulneración de derechos..." />
            </div>
            <div className="form-section">
              <h3 className="form-section-title">Factores de Riesgo y Generatividad</h3>
              <textarea className="input-field" rows={5} value={analisis.factores_riesgo_generatividad || ''} onChange={e => setAnalisis({...analisis, factores_riesgo_generatividad: e.target.value})} placeholder="Identifique factores de riesgo y generatividad..." />
            </div>
            <div className="form-section">
              <h3 className="form-section-title">Análisis Social y Recomendaciones</h3>
              <textarea className="input-field" rows={6} value={analisis.analisis_recomendaciones || ''} onChange={e => setAnalisis({...analisis, analisis_recomendaciones: e.target.value})} placeholder="Análisis social y recomendaciones técnicas al despacho..." />
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="animate-slide-up">
            <h2 className={styles.stepTitle}>Anexos Fotográficos</h2>
            <div className="form-section">
              <h3 className="form-section-title">Evidencia Visual</h3>
              <p style={{ marginBottom: '1rem', color: 'var(--on-surface-variant)' }}>Sube aquí fotografías del entorno familiar, estado de la vivienda, o cualquier evidencia pertinente al caso. Serán añadidas al reporte final.</p>
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Subir Fotografías (PNG, JPG)
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (!files || files.length === 0) return;
                      setSaving(true);
                      const newAnexos = [...(entrevista.anexos_fotograficos || [])];
                      try {
                        for (let i = 0; i < files.length; i++) {
                          const file = files[i];
                          const fileExt = file.name.split('.').pop();
                          const fileName = `${id}/${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
                          const { data, error } = await supabase.storage.from('anexos').upload(fileName, file);
                          if (error) {
                            alert(`Error subiendo foto: ${formatSupabaseError(error)}`);
                            continue;
                          }
                          const { data: { publicUrl } } = supabase.storage.from('anexos').getPublicUrl(data.path);
                          newAnexos.push(publicUrl);
                        }
                        setEntrevista({ ...entrevista, anexos_fotograficos: newAnexos });
                        alert('Fotos subidas con éxito. (Recuerda "Guardar Progreso")');
                      } catch (err: any) {
                        alert('Error fatal subiendo: ' + err.message);
                      }
                      setSaving(false);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {(entrevista.anexos_fotograficos || []).map((url, idx) => (
                  <div key={idx} style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--outline-variant)' }}>
                    <img src={url} alt={`Anexo ${idx + 1}`} style={{ width: '100%', height: '150px', objectFit: 'cover', display: 'block' }} />
                    <button 
                      className="btn btn-danger" 
                      style={{ position: 'absolute', top: '8px', right: '8px', padding: '0.2rem 0.5rem', fontSize: '0.9rem' }}
                      onClick={() => {
                        if (!confirm('¿Eliminar esta foto del reporte?')) return;
                        const filtered = (entrevista.anexos_fotograficos || []).filter((_, i) => i !== idx);
                        setEntrevista({ ...entrevista, anexos_fotograficos: filtered });
                      }}
                    >✕</button>
                  </div>
                ))}
                {(!entrevista.anexos_fotograficos || entrevista.anexos_fotograficos.length === 0) && (
                  <div style={{ gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', color: 'var(--outline)' }}>
                    No hay fotos adjuntas a este caso.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className={styles.navButtons}>
          {step > 0 && (
            <button className="btn btn-secondary" onClick={async () => { await saveCurrentStep(); setStep(step - 1); }} disabled={saving}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Anterior
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < STEPS.length - 1 ? (
            <button className="btn btn-primary" onClick={async () => { const success = await saveCurrentStep(); if (success) setStep(step + 1); }} disabled={saving}>
              {saving ? 'Guardando...' : 'Siguiente'}
              {!saving && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={finishEntrevista} disabled={saving}>
              {saving ? 'Guardando...' : '✓ Finalizar Entrevista'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
