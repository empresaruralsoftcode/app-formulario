// Type definitions for the form data

export interface Entrevista {
  id?: string;
  fecha_diligenciamiento: string;
  asunto: string;
  elaborado_por: string;
  tarjeta_profesional: string;
  dirigido_a: string;
  seccion: string;
  estado: 'borrador' | 'completado';
  created_at?: string;
  updated_at?: string;
}

export interface DatosNNA {
  id?: string;
  entrevista_id: string;
  fecha_nacimiento: string;
  edad: number | null;
  pais_nacimiento: string;
  nacionalidad: string;
  departamento: string;
  municipio: string;
  vereda: string;
  celular_acudiente: string;
  tipo_documento: string;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  sexo: string;
  institucion_educativa: string;
  grado: string;
  tiene_discapacidad: boolean;
  categorias_discapacidad: string[];
  descripcion_discapacidad_otra: string;
  grupo_etnico: string;
  pueblo_indigena: string;
  resguardo: string;
  lenguas: { lengua: string; clasificacion: string }[];
}

export interface CondicionesHabitacionales {
  id?: string;
  entrevista_id: string;
  lugar_descanso: string;
  duerme_con_adultos_habitacion: boolean | null;
  duerme_con_adultos_cama: boolean | null;
  afiliacion_salud: string;
  eps: string;
  motivo_no_afiliacion: string;
  vacunacion_completa: boolean | null;
  atencion_odontologica: boolean | null;
  motivo_no_odontologia: string;
  valoracion_desarrollo: boolean | null;
  motivo_no_valoracion: string;
  recibe_leche_materna: boolean | null;
  motivo_suspension_lactancia: string;
  edad_inicio_alimentacion: number | null;
  // Nutrition fields for children > 2 years
  comidas_al_dia: number | null;
  tipo_alimentacion: string[];
  consume_frutas_verduras: boolean | null;
  consume_proteinas: boolean | null;
  consume_lacteos: boolean | null;
  consume_agua_suficiente: boolean | null;
  tiene_horario_alimentacion: boolean | null;
  observaciones_nutricion: string;
}

export interface IntegranteHogar {
  id?: string;
  entrevista_id: string;
  nombre: string;
  parentesco: string;
  tipo_documento: string;
  numero_documento: string;
  fecha_nacimiento: string;
  edad?: number | null;
  sexo: string;
  genero: string;
  orientacion_sexual: string;
  grupo_etnico: string;
  nivel_escolaridad: string;
  actividad_principal: string;
  ingresos: number | null;
  orden: number;
}

export interface DinamicaFamiliar {
  id?: string;
  entrevista_id: string;
  criterio_liderazgo: string;
  vinculo_afectivo_fuerte: string;
  actividades_familiares: string[];
  metodos_correccion: string[];
  quien_corrige: string;
}

export interface VulnerabilidadEntorno {
  id?: string;
  entrevista_id: string;
  eventos_violencia: string[];
  redes_apoyo: string[];
  ubicacion_vivienda: string;
  tipo_vivienda: string;
  servicios_publicos: string[];
}

export interface InformacionCuidador {
  id?: string;
  entrevista_id: string;
  nombre: string;
  parentesco_tipo: string;
  edad: number | null;
  actividad_principal: string;
  horas_cuidado_diario: number | null;
  nna_queda_solo: boolean | null;
  tiempo_solo: string;
  estimulos_3_dias: string[];
  reconocimiento: string[];
}

export interface AnalisisSocial {
  id?: string;
  entrevista_id: string;
  metodologia_instrumentos: string;
  manifestaciones_nna: string;
  matriz_vulneracion_derechos: string;
  factores_riesgo_generatividad: string;
  analisis_recomendaciones: string;
}

// Options constants

export const TIPOS_DOCUMENTO = [
  { value: 'registro_civil', label: 'Registro Civil' },
  { value: 'tarjeta_identidad', label: 'Tarjeta de Identidad' },
  { value: 'pasaporte', label: 'Pasaporte' },
  { value: 'ppt', label: 'Permiso Especial de Permanencia Temporal (PPT)' },
  { value: 'no_tiene', label: 'No tiene' },
];

export const SEXOS = [
  { value: 'mujer', label: 'Mujer' },
  { value: 'hombre', label: 'Hombre' },
  { value: 'intersexual', label: 'Intersexual' },
];

export const CATEGORIAS_DISCAPACIDAD = [
  'Física', 'Intelectual', 'Psicosocial', 'Auditiva', 'Sordoceguera',
  'Múltiple', 'Sensorial', 'Sistémica', 'Voz/Habla', 'Piel/Pelo/Uñas', 'Otra'
];

export const PUEBLOS_INDIGENAS = [
  'Misak (Guambiano)', 'Nasa (Páez)', 'Yanacona', 'Coconuco', 'Inga',
  'Kamëntšá', 'Embera', 'Wayúu', 'Arhuaco', 'Zenú', 'Pijao', 'Otro'
];

export const TIPOS_ALIMENTACION = [
  'Desayuno', 'Media mañana', 'Almuerzo', 'Merienda', 'Cena', 'Otra'
];

export const GRUPOS_ETNICOS = [
  'Indígena', 'Negra', 'Afrocolombiana', 'Raizal', 'Gitana (Rom)', 'Palenquera', 'Ninguna'
];

export const LUGARES_DESCANSO = [
  'Hamaca', 'Cama', 'Colchoneta', 'Estera', 'Cuna', 'Plancha', 'Otro'
];

export const MOTIVOS_NO_AFILIACION = [
  'En trámite', 'Falta de dinero', 'Desconocimiento', 'Falta de interés',
  'Falta de entidad cercana', 'Otra'
];

export const MOTIVOS_SUSPENSION_LACTANCIA = [
  'Empleo', 'Ausencia materna', 'Dificultades de almacenamiento',
  'Falta de motivación', 'Desconocimiento', 'Tratamiento médico',
  'Presión familiar', 'Otro'
];

export const PARENTESCOS = [
  'Padre', 'Madre', 'Hermano/a', 'Abuelo/a', 'Tío/a',
  'Padrastro/Madrastra', 'Primo/a', 'Otro'
];

export const ACTIVIDADES_FAMILIARES = [
  'Pasear', 'Ver TV', 'Juegos', 'Leer', 'Eventos religiosos', 'Ninguna', 'Otra'
];

export const METODOS_CORRECCION = [
  'Palmadas', 'Pellizcos', 'Gritos', 'Hablando', 'Diálogo', 'Buen ejemplo', 'Otro'
];

export const EVENTOS_VIOLENCIA = [
  'Sexual', 'Psicológica', 'Física', 'Económica', 'Negligencia',
  'Conflicto armado', 'Castigo físico', 'Ninguna'
];

export const REDES_APOYO = ['Familia', 'Estado', 'Comunidad'];

export const UBICACIONES_VIVIENDA = [
  'Cabecera municipal', 'Centro poblado', 'Rural disperso'
];

export const TIPOS_VIVIENDA = [
  'Casa', 'Cambuche', 'Apartamento', 'Vivienda tradicional indígena',
  'Cuarto', 'Rancho', 'Finca', 'Casa lote', 'Centro de reclusión'
];

export const SERVICIOS_PUBLICOS = [
  'Energía', 'Acueducto', 'Alcantarillado', 'Gas natural', 'Telefonía fija'
];

export const VINCULOS_AFECTIVOS = [
  'Padre', 'Madre', 'Hermanos', 'Abuelos', 'Tíos', 'Padrastro/Madrastra', 'Otro'
];

export const ESTIMULOS_3_DIAS = [
  'Leer', 'Contar historias', 'Salir al patio', 'Jugar', 'Explorar', 'Bailar'
];

export const RECONOCIMIENTOS = [
  'Regalos', 'Dejarlo salir a jugar', 'Felicitación verbal', 'Otro'
];

export const PARENTESCOS_CUIDADOR = [
  'Familiar', 'Social', 'Comunitario', 'Institucional'
];

export const CRITERIOS_LIDERAZGO = [
  'Reconociendo el liderazgo familiar', 'Proveedor económico', 'Otro'
];
