import type {
  Employee, Contract, AbsenceCase, JobPosting,
  PQRCase, PayrollRecord, PerformanceRecord, InsightMetric
} from '@/types';

// ── Employees ─────────────────────────────────────────────────────────────────
export const employees: Employee[] = [
  { id:'E001', name:'Valentina Ríos',     initials:'VR', role:'Gerente de Talento',    department:'RRHH',          location:'Bogotá',      status:'active',    contractType:'indefinite',   startDate:'2020-03-15', email:'v.rios@zentryx.co',      phone:'+57 310 234 5678', salary:8500000,  manager:undefined },
  { id:'E002', name:'Andrés Morales',     initials:'AM', role:'Desarrollador Senior',  department:'Tecnología',    location:'Medellín',    status:'active',    contractType:'indefinite',   startDate:'2021-06-01', email:'a.morales@zentryx.co',   phone:'+57 315 345 6789', salary:7200000,  manager:'E001' },
  { id:'E003', name:'Luisa Fernández',    initials:'LF', role:'Analista Financiero',   department:'Finanzas',      location:'Bogotá',      status:'active',    contractType:'indefinite',   startDate:'2019-09-22', email:'l.fernandez@zentryx.co', phone:'+57 320 456 7890', salary:6100000,  manager:'E001' },
  { id:'E004', name:'Carlos Gómez',       initials:'CG', role:'Diseñador UX/UI',       department:'Tecnología',    location:'Cali',        status:'on-leave',  contractType:'indefinite',   startDate:'2022-01-10', email:'c.gomez@zentryx.co',     phone:'+57 300 567 8901', salary:5800000,  manager:'E002' },
  { id:'E005', name:'María Alejandra Soto',initials:'MS',role:'Coordinadora Legal',    department:'Legal',         location:'Bogotá',      status:'active',    contractType:'indefinite',   startDate:'2018-11-05', email:'ma.soto@zentryx.co',     phone:'+57 311 678 9012', salary:7800000,  manager:'E001' },
  { id:'E006', name:'Felipe Herrera',     initials:'FH', role:'Especialista Nómina',   department:'RRHH',          location:'Bogotá',      status:'active',    contractType:'fixed-term',   startDate:'2023-02-20', email:'f.herrera@zentryx.co',   phone:'+57 316 789 0123', salary:4500000,  manager:'E001' },
  { id:'E007', name:'Diana Castillo',     initials:'DC', role:'Analista de Datos',     department:'Tecnología',    location:'Barranquilla',status:'active',    contractType:'indefinite',   startDate:'2022-08-15', email:'d.castillo@zentryx.co',  phone:'+57 305 890 1234', salary:5500000,  manager:'E002' },
  { id:'E008', name:'Juan Martínez',      initials:'JM', role:'Ejecutivo Comercial',   department:'Ventas',        location:'Medellín',    status:'probation', contractType:'fixed-term',   startDate:'2024-01-08', email:'j.martinez@zentryx.co',  phone:'+57 312 901 2345', salary:4200000,  manager:'E001' },
  { id:'E009', name:'Sofía Vargas',       initials:'SV', role:'Asistente RRHH',        department:'RRHH',          location:'Bogotá',      status:'active',    contractType:'apprenticeship',startDate:'2023-07-01',email:'s.vargas@zentryx.co',    phone:'+57 317 012 3456', salary:2800000,  manager:'E001' },
  { id:'E010', name:'Roberto Jiménez',    initials:'RJ', role:'Contador Senior',       department:'Finanzas',      location:'Cali',        status:'inactive',  contractType:'indefinite',   startDate:'2017-04-12', email:'r.jimenez@zentryx.co',   phone:'+57 302 123 4567', salary:6500000,  manager:'E003' },
];

// ── Contracts ─────────────────────────────────────────────────────────────────
export const contracts: Contract[] = [
  { id:'C001', employeeId:'E001', employeeName:'Valentina Ríos',     type:'indefinite',   status:'active',         startDate:'2020-03-15', salary:8500000, department:'RRHH',       clauses:['Confidencialidad','No competencia','Dedicación exclusiva'] },
  { id:'C002', employeeId:'E002', employeeName:'Andrés Morales',     type:'indefinite',   status:'active',         startDate:'2021-06-01', salary:7200000, department:'Tecnología', clauses:['Confidencialidad','Propiedad intelectual'] },
  { id:'C003', employeeId:'E004', employeeName:'Carlos Gómez',       type:'indefinite',   status:'active',         startDate:'2022-01-10', salary:5800000, department:'Tecnología', clauses:['Confidencialidad'] },
  { id:'C004', employeeId:'E006', employeeName:'Felipe Herrera',     type:'fixed-term',   status:'expiring-soon',  startDate:'2023-02-20', endDate:'2025-02-20', salary:4500000, department:'RRHH',  clauses:['Confidencialidad','Renovación automática sujeta a evaluación'] },
  { id:'C005', employeeId:'E008', employeeName:'Juan Martínez',      type:'fixed-term',   status:'expiring-soon',  startDate:'2024-01-08', endDate:'2025-01-08', salary:4200000, department:'Ventas', clauses:['Metas de ventas','Comisiones'] },
  { id:'C006', employeeId:'E009', employeeName:'Sofía Vargas',       type:'apprenticeship',status:'active',        startDate:'2023-07-01', endDate:'2025-07-01', salary:2800000, department:'RRHH',  clauses:['SENA','Plan de aprendizaje'] },
  { id:'C007', employeeId:'E010', employeeName:'Roberto Jiménez',    type:'indefinite',   status:'expired',        startDate:'2017-04-12', endDate:'2024-12-31', salary:6500000, department:'Finanzas',clauses:['Confidencialidad'] },
];

// ── Absence Cases ─────────────────────────────────────────────────────────────
export const absenceCases: AbsenceCase[] = [
  { id:'A001', employeeId:'E004', employeeName:'Carlos Gómez',    date:'2025-03-10', type:'Incapacidad médica',    verdict:'accepted', confidence:94, summary:'Certificado médico válido emitido por EPS Sura. Diagnóstico: faringitis aguda. Reposo indicado por 3 días, coherente con el periodo reportado.', fileName:'incapacidad_cgomez.pdf' },
  { id:'A002', employeeId:'E008', employeeName:'Juan Martínez',   date:'2025-03-14', type:'Calamidad doméstica',   verdict:'review',   confidence:61, summary:'El documento indica fallecimiento de familiar, pero no especifica el grado de parentesco requerido por la política interna. Se recomienda solicitar acta de defunción.', fileName:'calamidad_jmartinez.jpg' },
  { id:'A003', employeeId:'E007', employeeName:'Diana Castillo',  date:'2025-03-18', type:'Cita médica',           verdict:'accepted', confidence:98, summary:'Comprobante de cita especializada en ortopedia. Hora y sede corresponden con el horario de ausencia reportado. Sin inconsistencias detectadas.', fileName:'cita_dcastillo.pdf' },
  { id:'A004', employeeId:'E009', employeeName:'Sofía Vargas',    date:'2025-03-20', type:'Incapacidad médica',    verdict:'rejected', confidence:87, summary:'La fecha del certificado médico es posterior a la fecha de ausencia reportada. Posible alteración del documento. Se recomienda proceso disciplinario.', fileName:'incapacidad_svargas.pdf' },
  { id:'A005', employeeId:'E002', employeeName:'Andrés Morales',  date:'2025-03-22', type:'Licencia de paternidad', verdict:'accepted', confidence:99, summary:'Registro civil de nacimiento vigente. Solicitud presentada dentro del término legal. Cumple todos los requisitos del Decreto 1283 de 2022.', fileName:'licencia_amorales.pdf' },
];

// ── Job Postings ──────────────────────────────────────────────────────────────
export const jobPostings: JobPosting[] = [
  {
    id:'J001', title:'Desarrollador Full-Stack Senior', department:'Tecnología', createdAt:'2025-03-15',
    candidates:[
      { id:'CV001', name:'Sebastián Ospina',  email:'s.ospina@email.com',  score:92, skills:['React','Node.js','PostgreSQL','Docker','AWS'], experience:6, rank:1, fileName:'cv_ospina.pdf',  summary:'Perfil destacado con 6 años en desarrollo web. Experiencia comprobada en arquitecturas de microservicios y despliegue en AWS. Stack técnico alineado al 95% con los requisitos del cargo.' },
      { id:'CV002', name:'Camila Bejarano',   email:'c.bejarano@email.com', score:85, skills:['React','TypeScript','MongoDB','Docker'],        experience:4, rank:2, fileName:'cv_bejarano.pdf', summary:'Sólida experiencia frontend con creciente participación en backend. Portfolio con proyectos empresariales relevantes. Requeriría inducción en AWS pero muestra curva de aprendizaje rápida.' },
      { id:'CV003', name:'Mateo Salcedo',     email:'m.salcedo@email.com',  score:78, skills:['Vue.js','Python','MySQL','Linux'],              experience:5, rank:3, fileName:'cv_salcedo.pdf',  summary:'Perfil sólido aunque con stack diferente al requerido. La experiencia en Python y bases de datos relacionales es un activo. Adaptación al stack React/Node necesaria.' },
    ],
  },
];

// ── PQR Cases ─────────────────────────────────────────────────────────────────
export const pqrCases: PQRCase[] = [
  { id:'PQR001', type:'queja',    subject:'Retraso en pago de nómina',           description:'El pago de la quincena no se reflejó a tiempo en la cuenta bancaria.',      submittedBy:'Felipe Herrera', department:'RRHH',       status:'in-progress', priority:'high',   createdAt:'2025-03-18', aiSuggestion:'Verificar con tesorería el estado del pago batch del día 15. Confirmar número de cuenta bancaria del colaborador y emitir comprobante de transferencia.' },
  { id:'PQR002', type:'pregunta', subject:'¿Cómo solicitar vacaciones?',         description:'Necesito saber el procedimiento para solicitar mis vacaciones pendientes.',   submittedBy:'Sofía Vargas',   department:'RRHH',       status:'resolved',    priority:'low',    createdAt:'2025-03-15', aiSuggestion:'Las vacaciones se solicitan a través del módulo de Horarios con 15 días de anticipación, con aprobación del líder directo.' },
  { id:'PQR003', type:'reclamo',  subject:'Descuento incorrecto en desprendible', description:'Me descontaron una suma que no corresponde a ningún concepto conocido.',    submittedBy:'Diana Castillo', department:'Finanzas',   status:'open',        priority:'high',   createdAt:'2025-03-20', aiSuggestion:'Revisar el desprendible del período afectado e identificar el concepto del descuento. Posiblemente relacionado con anticipo no registrado. Coordinar con nómina.' },
  { id:'PQR004', type:'queja',    subject:'Clima laboral en equipo de ventas',   description:'Existen conflictos recurrentes que afectan la productividad del equipo.',   submittedBy:'Juan Martínez',  department:'Ventas',     status:'in-progress', priority:'medium', createdAt:'2025-03-12', aiSuggestion:'Programar sesión de mediación con el líder de ventas y RRHH. Evaluar aplicación del protocolo de convivencia laboral.' },
  { id:'PQR005', type:'pregunta', subject:'Certificado laboral para crédito',    description:'Requiero un certificado laboral urgente para trámite bancario.',            submittedBy:'Andrés Morales', department:'Tecnología', status:'resolved',    priority:'medium', createdAt:'2025-03-22', aiSuggestion:'El certificado laboral se puede generar inmediatamente desde el módulo de Comunicaciones. Tiempo de entrega: 24 horas hábiles.' },
];

// ── Payroll ───────────────────────────────────────────────────────────────────
export const payrollRecords: PayrollRecord[] = [
  { id:'P001', employeeId:'E001', employeeName:'Valentina Ríos',    department:'RRHH',       period:'Marzo 2025', baseSalary:8500000, eps:340000,  pension:340000, arl:26350,  ccf:340000,  netPay:7453650,  status:'paid' },
  { id:'P002', employeeId:'E002', employeeName:'Andrés Morales',    department:'Tecnología', period:'Marzo 2025', baseSalary:7200000, eps:288000,  pension:288000, arl:22320,  ccf:288000,  netPay:6313680,  status:'paid' },
  { id:'P003', employeeId:'E003', employeeName:'Luisa Fernández',   department:'Finanzas',   period:'Marzo 2025', baseSalary:6100000, eps:244000,  pension:244000, arl:18910,  ccf:244000,  netPay:5349090,  status:'paid' },
  { id:'P004', employeeId:'E005', employeeName:'María A. Soto',     department:'Legal',      period:'Marzo 2025', baseSalary:7800000, eps:312000,  pension:312000, arl:24180,  ccf:312000,  netPay:6839820,  status:'paid' },
  { id:'P005', employeeId:'E006', employeeName:'Felipe Herrera',    department:'RRHH',       period:'Marzo 2025', baseSalary:4500000, eps:180000,  pension:180000, arl:13950,  ccf:180000,  netPay:3946050,  status:'pending' },
  { id:'P006', employeeId:'E007', employeeName:'Diana Castillo',    department:'Tecnología', period:'Marzo 2025', baseSalary:5500000, eps:220000,  pension:220000, arl:17050,  ccf:220000,  netPay:4822950,  status:'pending' },
  { id:'P007', employeeId:'E008', employeeName:'Juan Martínez',     department:'Ventas',     period:'Marzo 2025', baseSalary:4200000, eps:168000,  pension:168000, arl:13020,  ccf:168000,  netPay:3682980,  status:'processing' },
];

// ── Performance ───────────────────────────────────────────────────────────────
export const performanceRecords: PerformanceRecord[] = [
  { employeeId:'E001', employeeName:'Valentina Ríos',   department:'RRHH',       period:'Q1 2025', score:94, kpis:[{label:'Liderazgo',score:95,weight:30},{label:'Gestión de equipo',score:92,weight:35},{label:'Resultados',score:95,weight:35}] },
  { employeeId:'E002', employeeName:'Andrés Morales',   department:'Tecnología', period:'Q1 2025', score:88, kpis:[{label:'Calidad código',score:90,weight:40},{label:'Entregas a tiempo',score:85,weight:35},{label:'Colaboración',score:90,weight:25}] },
  { employeeId:'E003', employeeName:'Luisa Fernández',  department:'Finanzas',   period:'Q1 2025', score:91, kpis:[{label:'Precisión',score:95,weight:45},{label:'Reportes',score:88,weight:35},{label:'Iniciativa',score:90,weight:20}] },
  { employeeId:'E007', employeeName:'Diana Castillo',   department:'Tecnología', period:'Q1 2025', score:82, kpis:[{label:'Análisis',score:85,weight:40},{label:'Comunicación',score:78,weight:30},{label:'Aprendizaje',score:84,weight:30}] },
  { employeeId:'E008', employeeName:'Juan Martínez',    department:'Ventas',     period:'Q1 2025', score:71, kpis:[{label:'Ventas',score:68,weight:50},{label:'Clientes',score:75,weight:30},{label:'Actitud',score:74,weight:20}], notes:'En período de prueba. Se recomienda acompañamiento.' },
];

// ── Dashboard Insights ────────────────────────────────────────────────────────
export const dashboardInsights: InsightMetric[] = [
  { label:'Ausentismo mensual',  value:4.2,  change:-0.8, unit:'%',  trend:'down' },
  { label:'Contratos por vencer',value:2,    change:1,    unit:'',   trend:'up' },
  { label:'PQRs abiertos',       value:3,    change:-2,   unit:'',   trend:'down' },
  { label:'Desempeño promedio',  value:85.2, change:3.1,  unit:'pts',trend:'up' },
  { label:'Plantilla activa',    value:8,    change:0,    unit:'emp',trend:'stable' },
  { label:'Nómina pendiente',    value:2,    change:0,    unit:'',   trend:'stable' },
];

export const absenceTrendData = [
  { month:'Oct', rate:5.1 }, { month:'Nov', rate:4.8 }, { month:'Dic', rate:6.2 },
  { month:'Ene', rate:5.5 }, { month:'Feb', rate:5.0 }, { month:'Mar', rate:4.2 },
];

export const performanceTrendData = [
  { month:'Oct', avg:79 }, { month:'Nov', avg:81 }, { month:'Dic', avg:78 },
  { month:'Ene', avg:82 }, { month:'Feb', avg:83 }, { month:'Mar', avg:85 },
];

export const departmentHeadcount = [
  { dept:'RRHH',       count:3 },
  { dept:'Tecnología', count:3 },
  { dept:'Finanzas',   count:2 },
  { dept:'Legal',      count:1 },
  { dept:'Ventas',     count:1 },
];
