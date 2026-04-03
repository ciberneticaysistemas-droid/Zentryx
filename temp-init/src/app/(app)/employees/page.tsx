'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import { employees as initialEmployees } from '@/lib/data';
import { formatCOP, formatDate } from '@/lib/utils';
import type { Employee, EmployeeStatus, ContractType } from '@/types';
import { UserPlus, Search, Filter, Download, X } from 'lucide-react';

const statusMap: Record<string, { label:string; variant:'success'|'warning'|'danger'|'info' }> = {
  active:    { label:'Activo',   variant:'success' },
  'on-leave':{ label:'Licencia', variant:'warning' },
  inactive:  { label:'Inactivo', variant:'danger' },
  probation: { label:'Prueba',   variant:'info' },
};
const contractMap: Record<string, string> = {
  indefinite:'Indefinido','fixed-term':'Término Fijo',
  apprenticeship:'Aprendizaje',service:'Prestación Servicios',
};
const DEPARTMENTS = ['RRHH','Tecnología','Finanzas','Legal','Ventas','Operaciones'];
const LOCATIONS   = ['Bogotá','Medellín','Cali','Barranquilla','Bucaramanga'];
const CONTRACT_TYPES: [ContractType, string][] = [
  ['indefinite','Indefinido'],['fixed-term','Término Fijo'],
  ['apprenticeship','Aprendizaje'],['service','Prestación Servicios'],
];

const blank: Omit<Employee,'id'|'initials'> = {
  name:'', role:'', department:'RRHH', location:'Bogotá',
  status:'active', contractType:'indefinite', startDate:'',
  email:'', phone:'', salary:0, manager:undefined,
};

export default function EmployeesPage() {
  const [employees, setEmployees]  = useState<Employee[]>(initialEmployees);
  const [search, setSearch]        = useState('');
  const [showNew, setShowNew]      = useState(false);
  const [form, setForm]            = useState<Omit<Employee,'id'|'initials'>>(blank);
  const { toasts, toast, dismiss } = useToast();

  const filtered = employees.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.name.toLowerCase().includes(q)
      || e.role.toLowerCase().includes(q)
      || e.department.toLowerCase().includes(q)
      || e.email.toLowerCase().includes(q);
  });

  const exportCSV = () => {
    const bom = '\uFEFF';
    const header = ['ID','Nombre','Cargo','Departamento','Sede','Estado','Tipo Contrato','Ingreso','Salario','Email'];
    const rows   = employees.map(e => [e.id,e.name,e.role,e.department,e.location,e.status,e.contractType,e.startDate,e.salary,e.email]);
    const csv = bom + [header, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'empleados_zentryx.csv'; a.click();
    URL.revokeObjectURL(url);
    toast('success', `${employees.length} empleados exportados correctamente.`);
  };

  const submitNew = () => {
    if (!form.name || !form.role || !form.email || !form.startDate) {
      toast('error', 'Completa nombre, cargo, email y fecha de ingreso.');
      return;
    }
    const initials = form.name.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase();
    const id       = `E${String(employees.length + 1).padStart(3,'0')}`;
    const newEmp: Employee = { ...form, id, initials, salary: Number(form.salary) };
    setEmployees(prev => [newEmp, ...prev]);
    setShowNew(false);
    setForm(blank);
    toast('success', `${newEmp.name} añadido(a) a la plantilla.`);
  };

  const field = (key: keyof typeof form, label: string, type = 'text', placeholder = '') => (
    <div>
      <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>{label}</label>
      <input type={type} value={String(form[key] ?? '')}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg text-xs outline-none"
        style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-1)' }} />
    </div>
  );

  const sel = (key: keyof typeof form, label: string, options: [string,string][]) => (
    <div>
      <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>{label}</label>
      <select value={String(form[key] ?? '')}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full px-3 py-2 rounded-lg text-xs outline-none"
        style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-1)' }}>
        {options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );

  return (
    <>
      <Header title="Empleados" subtitle={`${employees.length} colaboradores registrados`} />

      <div className="flex-1 p-6 space-y-4 animate-fade-in-up">

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-48 flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
            style={{ background:'var(--zx-surface)', border:'1px solid var(--zx-border)' }}>
            <Search size={14} style={{ color:'var(--zx-text-3)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, cargo o departamento..."
              className="flex-1 bg-transparent outline-none text-xs"
              style={{ color:'var(--zx-text-1)' }} />
            {search && (
              <button onClick={() => setSearch('')}><X size={12} style={{ color:'var(--zx-text-3)' }} /></button>
            )}
          </div>
          <Button variant="secondary" size="sm" icon={<Download size={13} />} onClick={exportCSV}>
            Exportar
          </Button>
          <Button variant="primary" size="sm" icon={<UserPlus size={13} />} onClick={() => setShowNew(true)}>
            Nuevo empleado
          </Button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label:'Total activos',     value:employees.filter(e=>e.status==='active').length,    color:'var(--zx-success)' },
            { label:'En licencia',       value:employees.filter(e=>e.status==='on-leave').length,  color:'var(--zx-warning)' },
            { label:'Período de prueba', value:employees.filter(e=>e.status==='probation').length, color:'var(--zx-info)' },
            { label:'Inactivos',         value:employees.filter(e=>e.status==='inactive').length,  color:'var(--zx-danger)' },
          ].map(s => (
            <div key={s.label} className="rounded-xl px-4 py-3"
              style={{ background:'var(--zx-surface)', border:'1px solid var(--zx-border)' }}>
              <p className="text-2xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[11px] mt-0.5" style={{ color:'var(--zx-text-3)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {search && (
          <p className="text-xs" style={{ color:'var(--zx-text-3)' }}>
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} para "{search}"
          </p>
        )}

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ background:'var(--zx-surface)', border:'1px solid var(--zx-border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom:'1px solid var(--zx-border)', background:'var(--zx-surface-2)' }}>
                  {['Empleado','Departamento','Cargo','Tipo contrato','Ingreso','Salario','Estado'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold uppercase tracking-wide"
                      style={{ color:'var(--zx-text-3)', fontSize:'10px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color:'var(--zx-text-3)' }}>
                    No se encontraron empleados con esa búsqueda.
                  </td></tr>
                ) : filtered.map((emp, i) => {
                  const sm = statusMap[emp.status];
                  return (
                    <tr key={emp.id} className="zx-row transition-colors cursor-pointer"
                      style={{ borderBottom: i < filtered.length-1 ? '1px solid var(--zx-border)' : 'none' }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar initials={emp.initials} size="sm" />
                          <div>
                            <p className="font-medium" style={{ color:'var(--zx-text-1)' }}>{emp.name}</p>
                            <p style={{ color:'var(--zx-text-3)', fontSize:'10px' }}>{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3" style={{ color:'var(--zx-text-2)' }}>{emp.department}</td>
                      <td className="px-4 py-3" style={{ color:'var(--zx-text-2)' }}>{emp.role}</td>
                      <td className="px-4 py-3" style={{ color:'var(--zx-text-2)' }}>{contractMap[emp.contractType]}</td>
                      <td className="px-4 py-3 tabular-nums" style={{ color:'var(--zx-text-2)' }}>{formatDate(emp.startDate)}</td>
                      <td className="px-4 py-3 tabular-nums font-medium" style={{ color:'var(--zx-text-1)' }}>{formatCOP(emp.salary)}</td>
                      <td className="px-4 py-3"><Badge variant={sm.variant} dot>{sm.label}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* New Employee Modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Nuevo Empleado" size="xl">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">{field('name', 'Nombre completo *', 'text', 'Ej: María Fernández López')}</div>
          {field('role', 'Cargo *', 'text', 'Ej: Analista de Datos')}
          {sel('department', 'Departamento', DEPARTMENTS.map(d => [d,d]))}
          {sel('location', 'Sede', LOCATIONS.map(l => [l,l]))}
          {sel('status', 'Estado', [['active','Activo'],['probation','Período prueba'],['on-leave','Licencia'],['inactive','Inactivo']])}
          {sel('contractType', 'Tipo de contrato', CONTRACT_TYPES)}
          {field('startDate', 'Fecha de ingreso *', 'date')}
          {field('salary', 'Salario mensual (COP) *', 'number', 'Ej: 4500000')}
          <div className="col-span-2">{field('email', 'Correo electrónico *', 'email', 'nombre@empresa.co')}</div>
          {field('phone', 'Teléfono', 'tel', '+57 300 000 0000')}
          <div className="col-span-2 flex gap-2 pt-1">
            <Button variant="primary" className="flex-1 justify-center" onClick={submitNew}>
              Agregar empleado
            </Button>
            <Button variant="secondary" onClick={() => setShowNew(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
