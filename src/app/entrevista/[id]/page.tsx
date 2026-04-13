'use client';

import { useEffect, useState, use, useRef, useCallback } from 'react';
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

function BooleanGroup({ value, onChange }: { value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <div className="radio-group">
      <button type="button" className={`chip ${value === true ? 'chip-selected' : 'chip-unselected'}`} onClick={() => onChange(true)}>Sí</button>
      <button type="button" className={`chip ${value === false ? 'chip-selected' : 'chip-unselected'}`} onClick={() => onChange(false)}>No</button>
    </div>
  );
}

function SectionObservation({
  label,
  fieldName,
  observations,
  onToggle,
  onChangeNote,
}: {
  label: string;
  fieldName: string;
  observations: Record<string, { note: string, active: boolean }>;
  onToggle: (name: string) => void;
  onChangeNote: (name: string, note: string) => void;
}) {
  const obs = (observations && observations[fieldName]) || { note: '', active: false };

  return (
    <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '8px' }}>
      <div className={styles.labelContainer}>
        <label style={{ fontWeight: 600 }}>{label}</label>
        <label 
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '4px 8px', borderRadius: '4px' }}
        >
          <span style={{ fontSize: '10px', opacity: 0.7 }}>OBS.</span>
          <div className={styles.switch}>
            <input type="checkbox" checked={obs.active} onChange={() => onToggle(fieldName)} />
            <span className={styles.slider} style={obs.active ? { backgroundColor: 'var(--primary)' } : {}}></span>
          </div>
        </label>
      </div>
      {obs.active && (
        <div className={styles.observationArea}>
          <textarea 
            className="input-field" 
            placeholder="Añada una observación..." 
            value={obs.note} 
            onChange={(e) => onChangeNote(fieldName, e.target.value)}
            rows={2}
          />
        </div>
      )}
    </div>
  );
}

function ObservationField({ 
  label, 
  fieldName, 
  observations, 
  onToggle, 
  onChangeNote, 
  children 
}: { 
  label: string; 
  fieldName: string; 
  observations: Record<string, { note: string, active: boolean }>; 
  onToggle: (name: string) => void;
  onChangeNote: (name: string, note: string) => void;
  children: React.ReactNode;
}) {
  const obs = (observations && observations[fieldName]) || { note: '', active: false };

  return (
    <div className="input-group">
      <div className={styles.labelContainer}>
        <label>{label}</label>
        <label 
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '4px 8px', borderRadius: '4px' }}
        >
          <span style={{ fontSize: '10px', opacity: 0.7 }}>OBS.</span>
          <div className={styles.switch}>
            <input type="checkbox" checked={obs.active} onChange={() => onToggle(fieldName)} />
            <span className={styles.slider} style={obs.active ? { backgroundColor: 'var(--primary)' } : {}}></span>
          </div>
        </label>
      </div>
      {children}
      {obs.active && (
        <div className={styles.observationArea}>
          <textarea 
            className="input-field" 
            placeholder="Añada una observación..." 
            value={obs.note} 
            onChange={(e) => onChangeNote(fieldName, e.target.value)}
            rows={2}
          />
        </div>
      )}
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
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [step]);

  // Form Data
  const [entrevista, setEntrevista] = useState<Partial<T.Entrevista>>({
    estado: 'borrador', elaborado_por: '', tarjeta_profesional: '', dirigido_a: '', asunto: '', anexos_fotograficos: [],
  });
  const [datosNNA, setDatosNNA] = useState<Partial<T.DatosNNA>>({
    pais_nacimiento: 'Colombia', nacionalidad: 'Colombiana', tiene_discapacidad: false,
    categorias_discapacidad: [], lenguas: [], sexo: '', tipo_documento: '', grupo_etnico: '',
    descripcion_discapacidad_otra: '', pueblo_indigena: '', resguardo: '',
  });
  const [datosAgresor, setDatosAgresor] = useState<Partial<T.DatosAgresor>>({
    nombre: '', edad: '', lugar_residencia: '', ocupacion: '', grupo_poblacional_enfoque_diferencial: '', parentesco: '',
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
    metodologia_instrumentos: '[]', 
    manifestaciones_nna: '', 
    matriz_vulneracion_derechos: '[]', 
    factores_riesgo: '', 
    generatividad: '', 
    analisis_social: '',
    recomendaciones: [],
  });

  const saveObsTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  const toggleObservation = useCallback(async (name: string) => {
    console.log('toggleObservation called:', name);
    const current = entrevista.observaciones_campos || {};
    const obs = current[name] || { note: '', active: false };
    const newActive = !obs.active;
    const newObs = { ...obs, active: newActive };
    
    setEntrevista(prev => {
      const obsData = prev.observaciones_campos || {};
      return {
        ...prev,
        observaciones_campos: {
          ...obsData,
          [name]: newObs
        }
      };
    });

    if (saveObsTimeoutRef.current[name]) {
      clearTimeout(saveObsTimeoutRef.current[name]);
    }

    saveObsTimeoutRef.current[name] = setTimeout(async () => {
      delete saveObsTimeoutRef.current[name];
      const obsData = entrevista.observaciones_campos || {};
      await supabase.from('entrevistas').update({ 
        observaciones_campos: {
          ...obsData,
          [name]: newObs
        }
      }).eq('id', id);
      console.log('Saved to DB:', name, newObs);
    }, 300);
  }, [id, entrevista.observaciones_campos]);

  const updateObservationNote = useCallback(async (name: string, note: string) => {
    const current = entrevista.observaciones_campos || {};
    const obs = current[name] || { note: '', active: false };
    const newObs = { ...obs, note };
    
    setEntrevista(prev => {
      const obsData = prev.observaciones_campos || {};
      return {
        ...prev,
        observaciones_campos: {
          ...obsData,
          [name]: newObs
        }
      };
    });

    if (saveObsTimeoutRef.current[name]) {
      clearTimeout(saveObsTimeoutRef.current[name]);
    }

    saveObsTimeoutRef.current[name] = setTimeout(async () => {
      delete saveObsTimeoutRef.current[name];
      const obsData = entrevista.observaciones_campos || {};
      await supabase.from('entrevistas').update({ 
        observaciones_campos: {
          ...obsData,
          [name]: newObs
        }
      }).eq('id', id);
    }, 1000);
  }, [id, entrevista.observaciones_campos]);

  useEffect(() => {
    loadData();
  }, []);

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
    if (intg && intg.length > 0) setIntegrantes(intg);

    const { data: din } = await supabase.from('dinamica_familiar').select('*').eq('entrevista_id', id).single();
    if (din) setDinamica(din);

    const { data: vuln } = await supabase.from('vulnerabilidad_entorno').select('*').eq('entrevista_id', id).single();
    if (vuln) setVulnerabilidad(vuln);

    const { data: cuid } = await supabase.from('informacion_cuidador').select('*').eq('entrevista_id', id).single();
    if (cuid) setCuidador(cuid);

    const { data: anal } = await supabase.from('analisis_social').select('*').eq('entrevista_id', id).single();
    if (anal) {
      setAnalisis({
        ...anal,
        analisis_social: anal.analisis_social_content || anal.analisis_recomendaciones || '',
        recomendaciones: Array.isArray(anal.recomendaciones_lista) ? anal.recomendaciones_lista : [],
      });
    }

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
        // Remove dots from tarjeta_profesional before saving
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

      // Step 1: Datos NNA & Agresor
      if (step >= 1) {
        const payloadNNA = { ...datosNNA, entrevista_id: id };
        delete (payloadNNA as any).created_at;

        // Ensure Indigenous data is preserved if group is Indigena
        if (payloadNNA.grupo_etnico && !payloadNNA.grupo_etnico.startsWith('Indígena')) {
          payloadNNA.pueblo_indigena = '';
          payloadNNA.resguardo = '';
        }

        // Convert empty strings to null to avoid CHECK constraint violations
        (Object.keys(payloadNNA) as (keyof typeof payloadNNA)[]).forEach(k => {
          if (payloadNNA[k] === '') (payloadNNA[k] as any) = null;
        });

        const { data: nnaData, error: nnaErr } = await supabase
          .from('datos_nna')
          .upsert(payloadNNA, { onConflict: 'entrevista_id' })
          .select();
        if (nnaErr) {
          console.error('Error saving datos_nna:', formatSupabaseError(nnaErr));
          throw new Error(`Error guardando datos del NNA: ${formatSupabaseError(nnaErr)}`);
        }
        if (nnaData && nnaData.length > 0) setDatosNNA(nnaData[0]);

        const payloadAgresor = { ...datosAgresor, entrevista_id: id };
        delete (payloadAgresor as any).created_at;
        (Object.keys(payloadAgresor) as (keyof typeof payloadAgresor)[]).forEach(k => {
          if (payloadAgresor[k] === '') (payloadAgresor[k] as any) = null;
        });
        const { data: agreData, error: agreErr } = await supabase
          .from('datos_agresor')
          .upsert(payloadAgresor, { onConflict: 'entrevista_id' })
          .select();
        if (agreErr && agreErr.code !== '42P01') { 
          // 42P01 is table undefined. We ignore this safely locally if not migrated yet.
          console.error('Error saving datos_agresor:', formatSupabaseError(agreErr));
          throw new Error(`Error guardando datos del agresor: ${formatSupabaseError(agreErr)}`);
        }
        if (agreData && agreData.length > 0) setDatosAgresor(agreData[0]);
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
            if (!d.fecha_nacimiento) d.fecha_nacimiento = null as any;
            if (!d.numero_documento) d.numero_documento = null as any;
            (Object.keys(d) as (keyof typeof d)[]).forEach(k => {
              if (d[k] === '') (d[k] as any) = null;
            });
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
        (Object.keys(dinPayload) as (keyof typeof dinPayload)[]).forEach(k => {
          if (dinPayload[k] === '') (dinPayload[k] as any) = null;
        });
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
        (Object.keys(payload) as (keyof typeof payload)[]).forEach(k => {
          if (payload[k] === '') (payload[k] as any) = null;
        });
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
        (Object.keys(payload) as (keyof typeof payload)[]).forEach(k => {
          if (payload[k] === '') (payload[k] as any) = null;
        });
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

      // Always save Analisis Social table if it was modified (it now contains methodology used in Step 1)
      if (step >= 1) {
        const payload: any = { 
          entrevista_id: id,
          metodologia_instrumentos: analisis.metodologia_instrumentos,
          manifestaciones_nna: analisis.manifestaciones_nna,
          matriz_vulneracion_derechos: analisis.matriz_vulneracion_derechos,
          factores_riesgo: analisis.factores_riesgo,
          generatividad: analisis.generatividad,
          analisis_social_content: analisis.analisis_social,
          recomendaciones_lista: analisis.recomendaciones || [],
        };
        
        const { data: analData, error: analErr } = await supabase
          .from('analisis_social')
          .upsert(payload, { onConflict: 'entrevista_id' })
          .select();
        if (analErr) {
          console.error('Error saving analisis:', formatSupabaseError(analErr));
          throw new Error(`Error guardando análisis: ${formatSupabaseError(analErr)}`);
        }
        if (analData && analData.length > 0) {
          const savedAnal = analData[0];
          setAnalisis({
            ...savedAnal,
            analisis_social: savedAnal.analisis_social_content,
            recomendaciones: savedAnal.recomendaciones_lista,
          });
        }
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

      <main className={styles.main} ref={mainRef}>
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
                <div className="input-group">
                  <label>Tarjeta Profesional</label>
                  <input 
                    className="input-field" 
                    value={entrevista.tarjeta_profesional || ''} 
                    onChange={e => setEntrevista({ ...entrevista, tarjeta_profesional: e.target.value.replace(/\./g, '') })} 
                    placeholder="Número sin puntos..."
                  />
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
            <h2 className={styles.stepTitle}>Identificación del NNA, Objetivo y Presunto Agresor</h2>
            <div className="form-section">
              <h3 className="form-section-title">1. Datos Básicos del NNA</h3>
              <div className="form-row">
                <div className="input-group">
                  <label>Nombres</label>
                  <input className="input-field" value={datosNNA.nombres || ''} onChange={e => setDatosNNA({...datosNNA, nombres: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>Apellidos</label>
                  <input className="input-field" value={datosNNA.apellidos || ''} onChange={e => setDatosNNA({...datosNNA, apellidos: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>Fecha de Nacimiento</label>
                  <input type="date" className="input-field" value={datosNNA.fecha_nacimiento || ''} onChange={e => {
                    const dob = e.target.value;
                    const age = calculateAge(dob);
                    setDatosNNA({...datosNNA, fecha_nacimiento: dob, edad: age});
                  }} />
                </div>
                <div className="input-group">
                  <label>Edad</label>
                  <input type="number" className="input-field" value={datosNNA.edad ?? ''} onChange={e => setDatosNNA({...datosNNA, edad: e.target.value ? Number(e.target.value) : null})} />
                </div>
              </div>
              <div className="form-row">
                <div className="input-group">
                  <label>Tipo de Documento</label>
                  <select className="input-field" value={datosNNA.tipo_documento || ''} onChange={e => setDatosNNA({...datosNNA, tipo_documento: e.target.value})}>
                    <option value="">Seleccione...</option>
                    {T.TIPOS_DOCUMENTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Número de Documento</label>
                  <input className="input-field" value={datosNNA.numero_documento || ''} onChange={e => setDatosNNA({...datosNNA, numero_documento: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>Sexo</label>
                  <div className="radio-group">
                    {T.SEXOS.map(s => <button key={s.value} type="button" className={`chip ${datosNNA.sexo === s.value ? 'chip-selected' : 'chip-unselected'}`} onClick={() => setDatosNNA({...datosNNA, sexo: s.value})}>{s.label}</button>)}
                  </div>
                </div>
              </div>
              <SectionObservation label="Observaciones" fieldName="nna_identificacion" observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote} />
            </div>
            <div className="form-section">
              <h3 className="form-section-title">Ubicación</h3>
              <div className="form-row">
                <div className="input-group">
                  <label>País de Nacimiento</label>
                  <input className="input-field" value={datosNNA.pais_nacimiento || ''} onChange={e => setDatosNNA({...datosNNA, pais_nacimiento: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>Nacionalidad</label>
                  <input className="input-field" value={datosNNA.nacionalidad || ''} onChange={e => setDatosNNA({...datosNNA, nacionalidad: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>Departamento</label>
                  <input className="input-field" value={datosNNA.departamento || ''} onChange={e => setDatosNNA({...datosNNA, departamento: e.target.value})} />
                </div>
              </div>
              <div className="form-row">
                <div className="input-group">
                  <label>Municipio</label>
                  <input className="input-field" value={datosNNA.municipio || ''} onChange={e => setDatosNNA({...datosNNA, municipio: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>Vereda</label>
                  <input className="input-field" value={datosNNA.vereda || ''} onChange={e => setDatosNNA({...datosNNA, vereda: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>Celular del Acudiente</label>
                  <input className="input-field" value={datosNNA.celular_acudiente || ''} onChange={e => setDatosNNA({...datosNNA, celular_acudiente: e.target.value})} />
                </div>
              </div>
              <SectionObservation label="Observaciones" fieldName="nna_ubicacion" observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote} />
            </div>
            <div className="form-section">
              <h3 className="form-section-title">Educación</h3>
              <div className="form-row">
                <div className="input-group">
                  <label>Institución Educativa</label>
                  <input className="input-field" value={datosNNA.institucion_educativa || ''} onChange={e => setDatosNNA({...datosNNA, institucion_educativa: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>Grado</label>
                  <input className="input-field" value={datosNNA.grado || ''} onChange={e => setDatosNNA({...datosNNA, grado: e.target.value})} />
                </div>
              </div>
              <SectionObservation label="Observaciones" fieldName="nna_educacion" observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote} />
            </div>
            <div className="form-section">
              <h3 className="form-section-title">Discapacidad</h3>
              <div className="input-group">
                <label>¿Tiene discapacidad?</label>
                <div className="radio-group">
                  <button type="button" className={`chip ${datosNNA.tiene_discapacidad === true ? 'chip-selected' : 'chip-unselected'}`} onClick={() => setDatosNNA({...datosNNA, tiene_discapacidad: true})}>Sí</button>
                  <button type="button" className={`chip ${datosNNA.tiene_discapacidad === false ? 'chip-selected' : 'chip-unselected'}`} onClick={() => setDatosNNA({...datosNNA, tiene_discapacidad: false})}>No</button>
                </div>
              </div>
              {datosNNA.tiene_discapacidad && (
                <>
                  <ObservationField label="Categorías de Discapacidad" fieldName="nna_categorias_discapacidad" observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote}>
                    <ChipSelector options={T.CATEGORIAS_DISCAPACIDAD} selected={datosNNA.categorias_discapacidad as string[] || []} onChange={v => setDatosNNA({...datosNNA, categorias_discapacidad: v})} />
                  </ObservationField>
                  {(datosNNA.categorias_discapacidad as string[] || []).includes('Otra') && (
                    <ObservationField label="Describa la discapacidad" fieldName="nna_descripcion_discapacidad_otra" observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote}>
                      <textarea className="input-field" rows={3} value={datosNNA.descripcion_discapacidad_otra || ''} onChange={e => setDatosNNA({...datosNNA, descripcion_discapacidad_otra: e.target.value})} placeholder="Describa el tipo de discapacidad..." />
                    </ObservationField>
                  )}
                </>
              )}
              <SectionObservation label="Observaciones" fieldName="nna_discapacidad" observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote} />
            </div>
            <div className="form-section">
              <h3 className="form-section-title">Grupo Étnico</h3>
              <div className="input-group">
                <label>Grupo Étnico</label>
                <RadioGroupWithOtro options={T.GRUPOS_ETNICOS} value={datosNNA.grupo_etnico || null} onChange={v => setDatosNNA({...datosNNA, grupo_etnico: v || '', pueblo_indigena: v?.startsWith('Indígena') ? datosNNA.pueblo_indigena : '', resguardo: v?.startsWith('Indígena') ? datosNNA.resguardo : ''})} />
              </div>
              {(datosNNA.grupo_etnico === 'Indígena' || (datosNNA.grupo_etnico && datosNNA.grupo_etnico.startsWith('Indígena'))) && (
                <div style={{ marginTop: 'var(--space-4)' }}>
                  <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
                    <label>Pueblo Indígena</label>
                    <RadioGroupWithOtro options={T.PUEBLOS_INDIGENAS} value={datosNNA.pueblo_indigena || null} onChange={v => setDatosNNA({...datosNNA, pueblo_indigena: v || ''})} />
                  </div>
                  <div className="input-group">
                    <label>Resguardo</label>
                    <input className="input-field" value={datosNNA.resguardo || ''} onChange={e => setDatosNNA({...datosNNA, resguardo: e.target.value})} placeholder="Nombre del resguardo..." />
                  </div>
                </div>
              )}
              <SectionObservation label="Observaciones" fieldName="nna_grupo_etnico" observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote} />
            </div>
            <div className="form-section">
              <h3 className="form-section-title">2. Objetivo de la Verificación</h3>
              <div className="input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label>Descripción del Objetivo</label>
                  <button 
                    type="button" 
                    className="btn btn-tertiary" 
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    onClick={() => {
                      const nombre = `${datosNNA.nombres || ''} ${datosNNA.apellidos || ''}`.trim() || '[Nombre del NNA]';
                      const asunto = entrevista.asunto || '[Asunto/Vulneración]';
                      const text = `Verificar la garantía, el estado de protección y la posible vulneración de los derechos fundamentales del NNA ${nombre} presuntamente víctima de ${asunto}, mediante la valoración integral del contexto familiar, social y de cuidado, con el fin de identificar factores de riesgo y de protección, y aportar elementos técnicos que orienten la adopción de medidas administrativas inmediatas y pertinentes para el restablecimiento de derechos, conforme al interés superior del NNA y la normatividad vigente. `;
                      setEntrevista({...entrevista, objetivo_verificacion: text});
                    }}
                  >
                    🪄 Generar Automático
                  </button>
                </div>
                <textarea 
                  className="input-field" 
                  rows={6} 
                  value={entrevista.objetivo_verificacion || ''} 
                  onChange={e => setEntrevista({...entrevista, objetivo_verificacion: e.target.value})} 
                  placeholder="Escriba el objetivo de la verificación..."
                />
              </div>
              <SectionObservation label="Observaciones" fieldName="objetivo_verificacion" observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote} />
            </div>

            <div className="form-section">
              <h3 className="form-section-title">3. Metodología e Instrumentos Utilizados</h3>
              <div className="input-group">
                <label>Instrumentos y Metodología aplicada en la verificación</label>
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
                    <div style={{ width: '100%', marginTop: '0.5rem' }}>
                      <div className={styles.matrixContainer}>
                        <table className={styles.matrixTable}>
                          <thead>
                            <tr>
                              <th style={{ width: '30%' }}>Instrumento</th>
                              <th>Descripción / Aplicación</th>
                              <th style={{ width: '50px' }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.length === 0 && (
                              <tr>
                                <td colSpan={3} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>
                                  No se han registrado instrumentos. Añada uno para comenzar.
                                </td>
                              </tr>
                            )}
                            {items.map((item, i) => (
                              <tr key={i}>
                                <td className={styles.matrixCell}>
                                  <textarea className={styles.matrixInput} style={{ minHeight: '60px' }} value={item.instrumento} onChange={e => updateRow(i, 'instrumento', e.target.value)} placeholder="Ej: Entrevista" />
                                </td>
                                <td className={styles.matrixCell}>
                                  <textarea className={styles.matrixInput} style={{ minHeight: '60px' }} value={item.descripcion} onChange={e => updateRow(i, 'descripcion', e.target.value)} placeholder="Descripción..." />
                                </td>
                                <td className={styles.matrixCell}>
                                  <button type="button" onClick={() => removeRow(i)} className={styles.removeRowBtn}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <button type="button" onClick={addRow} className="btn btn-secondary" style={{ marginTop: '1rem', gap: '8px' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Añadir Instrumento
                      </button>
                    </div>
                  );
                })()}
              </div>
              <SectionObservation label="Observaciones" fieldName="analisis_metodologia" observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote} />
            </div>

            <div className="form-section">
              <h3 className="form-section-title">4. Información del Presunto Agresor</h3>
              <div className="form-row">
                <div className="input-group">
                  <label>Nombre Completo</label>
                  <input className="input-field" value={datosAgresor.nombre || ''} onChange={e => setDatosAgresor({...datosAgresor, nombre: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>Edad</label>
                  <input className="input-field" value={datosAgresor.edad || ''} onChange={e => setDatosAgresor({...datosAgresor, edad: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>Lugar de Residencia</label>
                  <input className="input-field" value={datosAgresor.lugar_residencia || ''} onChange={e => setDatosAgresor({...datosAgresor, lugar_residencia: e.target.value})} />
                </div>
              </div>
              <div className="form-row">
                <div className="input-group">
                  <label>Ocupación</label>
                  <input className="input-field" value={datosAgresor.ocupacion || ''} onChange={e => setDatosAgresor({...datosAgresor, ocupacion: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>Grupo Poblacional</label>
                  <input className="input-field" value={datosAgresor.grupo_poblacional_enfoque_diferencial || ''} onChange={e => setDatosAgresor({...datosAgresor, grupo_poblacional_enfoque_diferencial: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>Parentesco con NNA</label>
                  <input className="input-field" value={datosAgresor.parentesco || ''} onChange={e => setDatosAgresor({...datosAgresor, parentesco: e.target.value})} />
                </div>
              </div>
              <SectionObservation label="Observaciones" fieldName="agresor_info" observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-slide-up">
            <h2 className={styles.stepTitle}>Condiciones Habitacionales y Desarrollo</h2>
            <div className="form-section">
              <h3 className="form-section-title">Higiene y Descanso</h3>
              <div className="input-group">
                <label>Donde duerme el NNA</label>
                <RadioGroupWithOtro options={T.LUGARES_DESCANSO} value={condiciones.lugar_descanso || null} onChange={v => setCondiciones({...condiciones, lugar_descanso: v || ''})} />
              </div>
              <div className="form-row" style={{ marginTop: 'var(--space-4)' }}>
                <div className="input-group">
                  <label>¿Duerme con adultos en la misma habitación?</label>
                  <BooleanGroup value={condiciones.duerme_con_adultos_habitacion ?? null} onChange={v => setCondiciones({...condiciones, duerme_con_adultos_habitacion: v})} />
                </div>
                <div className="input-group">
                  <label>¿Duerme con adultos en la misma cama?</label>
                  <BooleanGroup value={condiciones.duerme_con_adultos_cama ?? null} onChange={v => setCondiciones({...condiciones, duerme_con_adultos_cama: v})} />
                </div>
              </div>
              <SectionObservation label="Observaciones" fieldName="cond_higiene_descanso" observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote} />
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
                <div className="input-group">
                  <label>EPS</label>
                  <input className="input-field" value={condiciones.eps || ''} onChange={e => setCondiciones({...condiciones, eps: e.target.value})} />
                </div>
              </div>
              {condiciones.afiliacion_salud === 'no_afiliado' && (
                <ObservationField label="Motivo de No Afiliación" fieldName="cond_motivo_no_afiliacion" observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote}>
                  <RadioGroupWithOtro options={T.MOTIVOS_NO_AFILIACION} value={condiciones.motivo_no_afiliacion || null} onChange={v => setCondiciones({...condiciones, motivo_no_afiliacion: v || ''})} />
                </ObservationField>
              )}
              <div className="form-row" style={{ marginTop: 'var(--space-4)' }}>
                <div className="input-group">
                  <label>Esquema de Vacunación Completo</label>
                  <BooleanGroup value={condiciones.vacunacion_completa ?? null} onChange={v => setCondiciones({...condiciones, vacunacion_completa: v})} />
                </div>
                <div className="input-group">
                  <label>Atención Odontológica</label>
                  <BooleanGroup value={condiciones.atencion_odontologica ?? null} onChange={v => setCondiciones({...condiciones, atencion_odontologica: v})} />
                </div>
              </div>
              <div className="input-group">
                <label>Valoración Integral del Desarrollo</label>
                <BooleanGroup value={condiciones.valoracion_desarrollo ?? null} onChange={v => setCondiciones({...condiciones, valoracion_desarrollo: v})} />
              </div>
<SectionObservation label="Observaciones" fieldName="cond_salud_prevencion" observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote} />
            </div>
            <div className="form-section">
              <h3 className="form-section-title">6. Alimentación y Nutrición</h3>
              {(datosNNA.edad === null || datosNNA.edad === undefined || datosNNA.edad <= 2) && (
                <>
                  <div className="input-group">
                    <label>¿Recibe leche materna?</label>
                    <BooleanGroup value={condiciones.recibe_leche_materna ?? null} onChange={v => setCondiciones({...condiciones, recibe_leche_materna: v})} />
                  </div>
                  {condiciones.recibe_leche_materna === false && (
                    <ObservationField label="Motivo de Suspensión" fieldName="cond_motivo_suspension_lactancia" observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote}>
                      <RadioGroupWithOtro options={T.MOTIVOS_SUSPENSION_LACTANCIA} value={condiciones.motivo_suspension_lactancia || null} onChange={v => setCondiciones({...condiciones, motivo_suspension_lactancia: v || ''})} />
                    </ObservationField>
                  )}
                  <div className="input-group">
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
                    <div className="input-group">
                      <label>¿Tiene horarios regulares de alimentación?</label>
                      <BooleanGroup value={condiciones.tiene_horario_alimentacion ?? null} onChange={v => setCondiciones({...condiciones, tiene_horario_alimentacion: v})} />
                    </div>
                  </div>
                  <ObservationField label="¿Qué comidas recibe habitualmente?" fieldName="cond_que_comidas" observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote}>
                    <ChipSelector options={T.TIPOS_ALIMENTACION} selected={condiciones.tipo_alimentacion as string[] || []} onChange={v => setCondiciones({...condiciones, tipo_alimentacion: v})} />
                  </ObservationField>
                  <div style={{ marginTop: 'var(--space-4)' }}>
                    <label className="label-lg" style={{ marginBottom: 'var(--space-3)', display: 'block' }}>Consumo de Grupos Alimenticios</label>
                    <div className="form-row">
                      <div className="input-group">
                        <label>¿Consume frutas y verduras regularmente?</label>
                        <BooleanGroup value={condiciones.consume_frutas_verduras ?? null} onChange={v => setCondiciones({...condiciones, consume_frutas_verduras: v})} />
                      </div>
                      <div className="input-group">
                        <label>¿Consume proteínas (carne, huevo, legumbres)?</label>
                        <BooleanGroup value={condiciones.consume_proteinas ?? null} onChange={v => setCondiciones({...condiciones, consume_proteinas: v})} />
                      </div>
                    </div>
                    <div className="form-row" style={{ marginTop: 'var(--space-3)' }}>
                      <div className="input-group">
                        <label>¿Consume lácteos (leche, queso, yogur)?</label>
                        <BooleanGroup value={condiciones.consume_lacteos ?? null} onChange={v => setCondiciones({...condiciones, consume_lacteos: v})} />
                      </div>
                      <div className="input-group">
                        <label>¿Toma suficiente agua al día?</label>
                        <BooleanGroup value={condiciones.consume_agua_suficiente ?? null} onChange={v => setCondiciones({...condiciones, consume_agua_suficiente: v})} />
                      </div>
                    </div>
                  </div>
                  <div className="input-group" style={{ marginTop: 'var(--space-4)' }}>
                    <label>Observaciones sobre la nutrición</label>
                    <textarea className="input-field" rows={3} value={condiciones.observaciones_nutricion || ''} onChange={e => setCondiciones({...condiciones, observaciones_nutricion: e.target.value})} placeholder="Estado nutricional observado..." />
                  </div>
                </>
              )}
              <SectionObservation label="Observaciones" fieldName="cond_alimentacion" observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote} />
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
                    <ObservationField label="Nombre" fieldName={`intg_${i}_nombre`} observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote}>
                      <input className="input-field" value={ig.nombre || ''} onChange={e => updateIntegrante(i, 'nombre', e.target.value)} />
                    </ObservationField>
                    <ObservationField label="Parentesco" fieldName={`intg_${i}_parentesco`} observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote}>
                      <select className="input-field" value={ig.parentesco || ''} onChange={e => updateIntegrante(i, 'parentesco', e.target.value)}>
                        <option value="">Seleccione...</option>
                        {T.PARENTESCOS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </ObservationField>
                  </div>
                  <div className="form-row">
                    <ObservationField label="Documento" fieldName={`intg_${i}_doc`} observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote}>
                      <input className="input-field" value={ig.numero_documento || ''} onChange={e => updateIntegrante(i, 'numero_documento', e.target.value)} />
                    </ObservationField>
                    <ObservationField label="Fecha de Nacimiento" fieldName={`intg_${i}_fecha_nac`} observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote}>
                      <input type="date" className="input-field" value={ig.fecha_nacimiento || ''} onChange={e => updateIntegrante(i, 'fecha_nacimiento', e.target.value)} />
                    </ObservationField>
                    <ObservationField label="Edad" fieldName={`intg_${i}_edad`} observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote}>
                      <input type="number" className="input-field" value={ig.edad ?? ''} onChange={e => updateIntegrante(i, 'edad', e.target.value ? Number(e.target.value) : null)} />
                    </ObservationField>
                    <ObservationField label="Sexo" fieldName={`intg_${i}_sexo`} observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote}>
                      <select className="input-field" value={ig.sexo || ''} onChange={e => updateIntegrante(i, 'sexo', e.target.value)}>
                        <option value="">Seleccione...</option>
                        {T.SEXOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </ObservationField>
                  </div>
                  <div className="form-row">
                    <ObservationField label="Nivel de Escolaridad" fieldName={`intg_${i}_escolaridad`} observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote}>
                      <input className="input-field" value={ig.nivel_escolaridad || ''} onChange={e => updateIntegrante(i, 'nivel_escolaridad', e.target.value)} />
                    </ObservationField>
                    <ObservationField label="Actividad Principal" fieldName={`intg_${i}_actividad`} observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote}>
                      <input className="input-field" value={ig.actividad_principal || ''} onChange={e => updateIntegrante(i, 'actividad_principal', e.target.value)} />
                    </ObservationField>
                    <ObservationField label="Ingresos" fieldName={`intg_${i}_ingresos`} observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote}>
                      <input type="number" className="input-field" value={ig.ingresos ?? ''} onChange={e => updateIntegrante(i, 'ingresos', e.target.value ? Number(e.target.value) : null)} />
                    </ObservationField>
                  </div>
                  <div className="form-row">
                    <ObservationField label="Estado Civil" fieldName={`intg_${i}_estado_civil`} observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote}>
                      <input className="input-field" value={ig.estado_civil || ''} onChange={e => updateIntegrante(i, 'estado_civil', e.target.value)} placeholder="Ej: Soltero(a), Casado(a)" />
                    </ObservationField>
                    <ObservationField label="Contacto" fieldName={`intg_${i}_contacto`} observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote}>
                      <input className="input-field" type="tel" value={ig.contacto || ''} onChange={e => updateIntegrante(i, 'contacto', e.target.value)} placeholder="Ej: 3001234567" />
                    </ObservationField>
                  </div>
                  <div className="form-row">
                    <ObservationField label="EPS" fieldName={`intg_${i}_eps`} observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote}>
                      <input className="input-field" value={ig.eps || ''} onChange={e => updateIntegrante(i, 'eps', e.target.value)} placeholder="Ej: Sanitas, Sura..." />
                    </ObservationField>
                    <ObservationField label="Régimen de Salud" fieldName={`intg_${i}_regimen`} observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote}>
                      <select className="input-field" value={ig.regimen_salud || ''} onChange={e => updateIntegrante(i, 'regimen_salud', e.target.value)}>
                        <option value="">Seleccione...</option>
                        <option value="Subsidiado">Subsidiado</option>
                        <option value="Contributivo">Contributivo</option>
                        <option value="Especial/Excepción">Especial/Excepción</option>
                        <option value="No afiliado">No afiliado</option>
                      </select>
                    </ObservationField>
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
              <div className="input-group">
                <label>Vínculo Afectivo Más Fuerte</label>
                <RadioGroupWithOtro options={T.VINCULOS_AFECTIVOS} value={dinamica.vinculo_afectivo_fuerte || null} onChange={v => setDinamica({...dinamica, vinculo_afectivo_fuerte: v || ''})} />
              </div>
              <div className="input-group">
                <label>Actividades Familiares</label>
                <ChipSelector options={T.ACTIVIDADES_FAMILIARES} selected={dinamica.actividades_familiares as string[] || []} onChange={v => setDinamica({...dinamica, actividades_familiares: v})} />
              </div>
              <div className="input-group">
                <label>Métodos de Corrección</label>
                <ChipSelector options={T.METODOS_CORRECCION} selected={dinamica.metodos_correccion as string[] || []} onChange={v => setDinamica({...dinamica, metodos_correccion: v})} />
              </div>
              <div className="input-group">
                <label>¿Quién Corrige?</label>
                <input className="input-field" value={dinamica.quien_corrige || ''} onChange={e => setDinamica({...dinamica, quien_corrige: e.target.value})} placeholder="Nombre o parentesco..." />
              </div>
              <SectionObservation label="Observaciones" fieldName="dinamica_relacional" observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote} />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-slide-up">
            <h2 className={styles.stepTitle}>Vulnerabilidad y Entorno</h2>
            <div className="form-section">
              <h3 className="form-section-title">Eventos de Violencia en el Hogar</h3>
              <div className="input-group">
                <label>Eventos de Violencia</label>
                <ChipSelector options={T.EVENTOS_VIOLENCIA} selected={vulnerabilidad.eventos_violencia as string[] || []} onChange={v => setVulnerabilidad({...vulnerabilidad, eventos_violencia: v})} />
              </div>
              <SectionObservation label="Observaciones" fieldName="vuln_violencia" observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote} />
            </div>
            <div className="form-section">
              <h3 className="form-section-title">Redes de Apoyo</h3>
              <div className="input-group">
                <label>Redes de Apoyo</label>
                <ChipSelector options={T.REDES_APOYO} selected={vulnerabilidad.redes_apoyo as string[] || []} onChange={v => setVulnerabilidad({...vulnerabilidad, redes_apoyo: v})} />
              </div>
              <SectionObservation label="Observaciones" fieldName="vuln_redes" observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote} />
            </div>
            <div className="form-section">
              <h3 className="form-section-title">Características de la Vivienda</h3>
              <div className="input-group">
                <label>Ubicación</label>
                <RadioGroupWithOtro options={T.UBICACIONES_VIVIENDA} value={vulnerabilidad.ubicacion_vivienda || null} onChange={v => setVulnerabilidad({...vulnerabilidad, ubicacion_vivienda: v || ''})} />
              </div>
              <div className="input-group">
                <label>Tipo de Vivienda</label>
                <RadioGroupWithOtro options={T.TIPOS_VIVIENDA} value={vulnerabilidad.tipo_vivienda || null} onChange={v => setVulnerabilidad({...vulnerabilidad, tipo_vivienda: v || ''})} />
              </div>
              <div className="input-group">
                <label>Servicios Públicos</label>
                <ChipSelector options={T.SERVICIOS_PUBLICOS} selected={vulnerabilidad.servicios_publicos as string[] || []} onChange={v => setVulnerabilidad({...vulnerabilidad, servicios_publicos: v})} />
              </div>
              <SectionObservation label="Observaciones" fieldName="vuln_vivienda" observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote} />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="animate-slide-up">
            <h2 className={styles.stepTitle}>Información del Cuidador e Interacción</h2>
            <div className="form-section">
              <h3 className="form-section-title">Perfil del Cuidador</h3>
              <div className="form-row">
                <div className="input-group">
                  <label>Nombre</label>
                  <input className="input-field" value={cuidador.nombre || ''} onChange={e => setCuidador({...cuidador, nombre: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>Tipo de Parentesco</label>
                  <div className="radio-group">
                    {T.PARENTESCOS_CUIDADOR.map(p => <button key={p} type="button" className={`chip ${cuidador.parentesco_tipo === p ? 'chip-selected' : 'chip-unselected'}`} onClick={() => setCuidador({...cuidador, parentesco_tipo: p})}>{p}</button>)}
                  </div>
                </div>
              </div>
              <div className="form-row">
                <div className="input-group">
                  <label>Edad</label>
                  <input type="number" className="input-field" value={cuidador.edad ?? ''} onChange={e => setCuidador({...cuidador, edad: e.target.value ? Number(e.target.value) : null})} />
                </div>
                <div className="input-group">
                  <label>Actividad Principal</label>
                  <input className="input-field" value={cuidador.actividad_principal || ''} onChange={e => setCuidador({...cuidador, actividad_principal: e.target.value})} />
                </div>
              </div>
              <SectionObservation label="Observaciones" fieldName="cuidador_perfil" observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote} />
            </div>
            <div className="form-section">
              <h3 className="form-section-title">Tiempo e Interacción</h3>
              <div className="form-row">
                <div className="input-group">
                  <label>Horas diarias de cuidado</label>
                  <input type="number" className="input-field" value={cuidador.horas_cuidado_diario ?? ''} onChange={e => setCuidador({...cuidador, horas_cuidado_diario: e.target.value ? Number(e.target.value) : null})} />
                </div>
                <div className="input-group">
                  <label>¿El NNA queda solo?</label>
                  <BooleanGroup value={cuidador.nna_queda_solo ?? null} onChange={v => setCuidador({...cuidador, nna_queda_solo: v})} />
                </div>
              </div>
              {cuidador.nna_queda_solo && (
                <ObservationField label="¿Cuánto tiempo queda solo?" fieldName="cuid_tiempo_solo" observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote}>
                  <input className="input-field" value={cuidador.tiempo_solo || ''} onChange={e => setCuidador({...cuidador, tiempo_solo: e.target.value})} placeholder="Ej: 2 horas al día" />
                </ObservationField>
              )}
              <SectionObservation label="Observaciones" fieldName="cuidador_tiempo" observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote} />
            </div>
            <div className="form-section">
              <h3 className="form-section-title">Actividades (últimos 3 días)</h3>
              <div className="input-group">
                <label>Actividades Realizadas</label>
                <ChipSelector options={T.ESTIMULOS_3_DIAS} selected={cuidador.estimulos_3_dias as string[] || []} onChange={v => setCuidador({...cuidador, estimulos_3_dias: v})} />
              </div>
              <SectionObservation label="Observaciones" fieldName="cuidador_actividades" observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote} />
            </div>
            <div className="form-section">
              <h3 className="form-section-title">Reconocimiento</h3>
              <div className="input-group">
                <label>Reconocimientos</label>
                <ChipSelector options={T.RECONOCIMIENTOS} selected={cuidador.reconocimiento as string[] || []} onChange={v => setCuidador({...cuidador, reconocimiento: v})} />
              </div>
              <SectionObservation label="Observaciones" fieldName="cuidador_reconocimiento" observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote} />
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="animate-slide-up">
            <h2 className={styles.stepTitle}>Análisis Social y Conclusiones</h2>
            <div className="form-section">
              <h3 className="form-section-title">11. Análisis Social y Conclusiones</h3>

            <div className="form-section">
              <h4 className="form-section-title" style={{ fontSize: '1.1rem', opacity: 0.9 }}>11.1 Manifestaciones o situación actual del NNA</h4>
              <div className="input-group">
                <textarea className="input-field" rows={4} value={analisis.manifestaciones_nna || ''} onChange={e => setAnalisis({...analisis, manifestaciones_nna: e.target.value})} placeholder="Manifestaciones del niño, niña o adolescente..." />
              </div>
              <SectionObservation label="Observaciones" fieldName="analisis_manifestaciones" observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote} />
            </div>

            <div className="form-section">
              <h4 className="form-section-title" style={{ fontSize: '1.1rem', opacity: 0.9 }}>11.2 Matriz de Vulneración de Derechos Identificados</h4>
              <div className="form-row" style={{ overflowX: 'auto' }}>
                {(() => {
                  let items: any[] = [];
                  try {
                    items = JSON.parse(analisis.matriz_vulneracion_derechos || '[]');
                  } catch { items = []; }

                  const updateRow = (index: number, field: string, val: string) => {
                    const newItems = [...items];
                    newItems[index] = { ...newItems[index], [field]: val };
                    setAnalisis({ ...analisis, matriz_vulneracion_derechos: JSON.stringify(newItems) });
                  };
                  const removeRow = (index: number) => {
                    const newItems = items.filter((_, i) => i !== index);
                    setAnalisis({ ...analisis, matriz_vulneracion_derechos: JSON.stringify(newItems) });
                  };
                  const addRow = () => {
                    const newItems = [...items, { derecho: '', situacion: '', afectacion: '', factores: '', riesgo: '' }];
                    setAnalisis({ ...analisis, matriz_vulneracion_derechos: JSON.stringify(newItems) });
                  };

                  return (
                    <div style={{ width: '100%' }}>
                      <div className={styles.matrixContainer}>
                        <table className={styles.matrixTable}>
                          <thead>
                            <tr>
                              <th style={{ width: '22%' }}>Derecho</th>
                              <th style={{ width: '25%' }}>Situación evidenciada</th>
                              <th style={{ width: '18%' }}>Tipo de afectación</th>
                              <th style={{ width: '25%' }}>Factores asociados</th>
                              <th style={{ width: '15%' }}>Nivel de riesgo</th>
                              <th style={{ width: '50px' }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.length === 0 && (
                              <tr>
                                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>
                                  No se han identificado vulneraciones. Añada una fila para comenzar.
                                </td>
                              </tr>
                            )}
                            {items.map((item, i) => (
                              <tr key={i}>
                                <td className={styles.matrixCell}>
                                  <textarea className={styles.matrixInput} value={item.derecho} onChange={e => updateRow(i, 'derecho', e.target.value)} placeholder="Ej: Derecho a la salud..." />
                                </td>
                                <td className={styles.matrixCell}>
                                  <textarea className={styles.matrixInput} value={item.situacion} onChange={e => updateRow(i, 'situacion', e.target.value)} placeholder="Describa los hallazgos..." />
                                </td>
                                <td className={styles.matrixCell}>
                                  <select className={styles.matrixSelect} value={item.afectacion} onChange={e => updateRow(i, 'afectacion', e.target.value)}>
                                    <option value="">Seleccione...</option>
                                    <option value="Amenaza">Amenaza</option>
                                    <option value="Vulneración">Vulneración</option>
                                    <option value="Inobservancia">Inobservancia</option>
                                  </select>
                                </td>
                                <td className={styles.matrixCell}>
                                  <textarea className={styles.matrixInput} value={item.factores} onChange={e => updateRow(i, 'factores', e.target.value)} placeholder="Factores de riesgo/protección..." />
                                </td>
                                <td className={styles.matrixCell}>
                                  <select className={styles.matrixSelect} value={item.riesgo} onChange={e => updateRow(i, 'riesgo', e.target.value)}>
                                    <option value="">Seleccione...</option>
                                    <option value="Bajo">Bajo</option>
                                    <option value="Medio">Medio</option>
                                    <option value="Alto">Alto</option>
                                  </select>
                                </td>
                                <td className={styles.matrixCell}>
                                  <button type="button" onClick={() => removeRow(i)} className={styles.removeRowBtn} title="Eliminar fila">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <button type="button" onClick={addRow} className="btn btn-secondary" style={{ marginBottom: '1.5rem', gap: '8px' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Añadir Derecho a la Matriz
                      </button>
                    </div>
                  );
                })()}
              </div>
              <SectionObservation label="Observaciones" fieldName="analisis_matriz" observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote} />
            </div>
            <div className="form-section">
              <h4 className="form-section-title" style={{ fontSize: '1.1rem', opacity: 0.9 }}>11.3 Factores de Riesgo</h4>
              <div className="input-group">
                <textarea className="input-field" rows={4} value={analisis.factores_riesgo || ''} onChange={e => setAnalisis({...analisis, factores_riesgo: e.target.value})} placeholder="Identifique factores de riesgo..." />
              </div>
              <SectionObservation label="Observaciones" fieldName="analisis_riesgo" observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote} />
            </div>

            <div className="form-section">
              <h4 className="form-section-title" style={{ fontSize: '1.1rem', opacity: 0.9 }}>11.4 Generatividad</h4>
              <div className="input-group">
                <textarea className="input-field" rows={4} value={analisis.generatividad || ''} onChange={e => setAnalisis({...analisis, generatividad: e.target.value})} placeholder="Aspectos de generatividad..." />
              </div>
              <SectionObservation label="Observaciones" fieldName="analisis_generatividad" observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote} />
            </div>

            <div className="form-section">
              <h4 className="form-section-title" style={{ fontSize: '1.1rem', opacity: 0.9 }}>11.5 Análisis Social</h4>
              <div className="input-group">
                <textarea className="input-field" rows={6} value={analisis.analisis_social || ''} onChange={e => setAnalisis({...analisis, analisis_social: e.target.value})} placeholder="Análisis social integral..." />
              </div>
              <SectionObservation label="Observaciones" fieldName="analisis_social" observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote} />
            </div>

            <div className="form-section">
              <h4 className="form-section-title" style={{ fontSize: '1.1rem', opacity: 0.9 }}>11.6 Recomendaciones</h4>
              <div className="input-group">
                <label>Recomendaciones Técnicas</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {(analisis.recomendaciones || []).map((rec, i) => (
                    <div key={i} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
                      <span style={{ marginTop: '12px', color: 'var(--primary)' }}>•</span>
                      <textarea 
                        className="input-field" 
                        rows={2} 
                        value={rec} 
                        onChange={e => {
                          const newList = [...(analisis.recomendaciones || [])];
                          newList[i] = e.target.value;
                          setAnalisis({...analisis, recomendaciones: newList});
                        }}
                        placeholder="Escriba la recomendación..."
                      />
                      <button 
                        type="button" 
                        onClick={() => {
                          const newList = (analisis.recomendaciones || []).filter((_, idx) => idx !== i);
                          setAnalisis({...analisis, recomendaciones: newList});
                        }} 
                        className="btn btn-tertiary" 
                        style={{ color: 'var(--error)', padding: '8px' }}
                      >✕</button>
                    </div>
                  ))}
                  <button 
                    type="button" 
                    onClick={() => setAnalisis({...analisis, recomendaciones: [...(analisis.recomendaciones || []), '']})} 
                    className="btn btn-secondary" 
                    style={{ alignSelf: 'flex-start', borderStyle: 'dashed' }}
                  >+ Añadir Recomendación</button>
                </div>
              </div>
              <SectionObservation label="Observaciones" fieldName="analisis_recomendaciones" observations={entrevista.observaciones_campos || {}} onToggle={toggleObservation} onChangeNote={updateObservationNote} />
            </div>
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="animate-slide-up">
            <h2 className={styles.stepTitle}>Anexos Fotográficos</h2>
            <div className="form-section">
              <h3 className="form-section-title">12. Anexos Fotográficos</h3>
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
                          newAnexos.push({ url: publicUrl, descripcion: '' });
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
                {(entrevista.anexos_fotograficos || []).map((anexo, idx) => {
                  const url = typeof anexo === 'string' ? anexo : anexo?.url;
                  const desc = typeof anexo === 'string' ? '' : (anexo?.descripcion || '');
                  if (!url) return null;
                  
                  return (
                  <div key={idx} style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--outline-variant)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ position: 'relative' }}>
                      <img src={url} alt={`Anexo ${idx + 1}`} style={{ width: '100%', height: '150px', objectFit: 'cover', display: 'block' }} />
                      <button 
                        className="btn btn-danger" 
                        style={{ position: 'absolute', top: '8px', right: '8px', padding: '0.2rem 0.5rem', fontSize: '0.9rem', width: 'auto' }}
                        onClick={() => {
                          if (!confirm('¿Eliminar esta foto del reporte?')) return;
                          const filtered = (entrevista.anexos_fotograficos || []).filter((_, i) => i !== idx);
                          setEntrevista({ ...entrevista, anexos_fotograficos: filtered });
                        }}
                      >✕</button>
                    </div>
                    <textarea 
                      placeholder="Añadir descripción de esta fotografía..."
                      value={desc}
                      onChange={(e) => {
                        const copy = [...(entrevista.anexos_fotograficos || [])];
                        if (typeof copy[idx] === 'string') { 
                          copy[idx] = { url: copy[idx], descripcion: e.target.value }; 
                        } else { 
                          copy[idx] = { ...copy[idx], descripcion: e.target.value }; 
                        }
                        setEntrevista({ ...entrevista, anexos_fotograficos: copy });
                      }}
                      style={{ padding: '8px', border: 'none', borderTop: '1px solid var(--outline-variant)', fontSize: '0.85rem', resize: 'none', outline: 'none', fontFamily: 'inherit' }}
                      rows={3}
                    />
                  </div>
                )})}
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
