'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import { employees } from '@/lib/data';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

type ShiftType = 'morning'|'afternoon'|'night'|'full'|'remote'|'off';

const shiftMap: Record<ShiftType, { label:string; short:string; color:string; bg:string }> = {
  morning:   { label:'Mañana',   short:'M', color:'var(--zx-info)',    bg:'var(--zx-info-muted)' },
  afternoon: { label:'Tarde',    short:'T', color:'var(--zx-warning)', bg:'var(--zx-warning-muted)' },
  night:     { label:'Noche',    short:'N', color:'var(--zx-accent)',  bg:'var(--zx-accent-muted)' },
  full:      { label:'Completo', short:'C', color:'var(--zx-success)', bg:'var(--zx-success-muted)' },
  remote:    { label:'Remoto',   short:'R', color:'var(--zx-accent)',  bg:'var(--zx-accent-muted)' },
  off:       { label:'Libre',    short:'—', color:'var(--zx-text-3)',  bg:'var(--zx-surface-3)' },
};

const DAYS   = ['Lun 24','Mar 25','Mié 26','Jue 27','Vie 28','Sáb 29','Dom 30'];
const DAY_KEYS = ['mon','tue','wed','thu','fri','sat','sun'];

type Schedule = Record<string, ShiftType[]>;

const initialSchedule: Schedule = {
  E001: ['full','full','full','full','full','off','off'],
  E002: ['morning','morning','remote','morning','morning','off','off'],
  E003: ['full','full','full','off','full','off','off'],
  E005: ['full','full','remote','full','full','off','off'],
  E006: ['morning','morning','morning','morning','morning','off','off'],
  E007: ['remote','full','full','full','remote','off','off'],
  E008: ['afternoon','afternoon','afternoon','afternoon','afternoon','morning','off'],
  E009: ['morning','morning','morning','morning','morning','off','off'],
};

export default function SchedulePage() {
  const [schedule, setSchedule]   = useState<Schedule>(initialSchedule);
  const [showAssign, setShowAssign] = useState(false);
  const [form, setForm] = useState({
    employeeId: employees.find(e => schedule[e.id])?. id ?? '',
    dayIdx:     0,
    shift:      'full' as ShiftType,
  });
  const { toasts, toast, dismiss } = useToast();

  const activeEmps = employees.filter(e => schedule[e.id]);

  const cycleDayShift = (empId: string, dayIdx: number) => {
    const order: ShiftType[] = ['full','morning','afternoon','night','remote','off'];
    setSchedule(prev => {
      const current = prev[empId]?.[dayIdx] ?? 'off';
      const idx     = order.indexOf(current);
      const next    = order[(idx + 1) % order.length];
      const shifts  = [...(prev[empId] ?? Array(7).fill('off'))];
      shifts[dayIdx] = next;
      return { ...prev, [empId]: shifts };
    });
  };

  const assignShift = () => {
    if (!form.employeeId) { toast('error', 'Selecciona un empleado.'); return; }
    setSchedule(prev => {
      const shifts = [...(prev[form.employeeId] ?? Array(7).fill('off'))];
      shifts[form.dayIdx] = form.shift;
      return { ...prev, [form.employeeId]: shifts };
    });
    const emp  = employees.find(e => e.id === form.employeeId);
    const day  = DAYS[form.dayIdx];
    const sft  = shiftMap[form.shift];
    toast('success', `Turno "${sft.label}" asignado a ${emp?.name?.split(' ')[0]} el ${day}.`);
    setShowAssign(false);
  };

  const addEmployeeToSchedule = (empId: string) => {
    setSchedule(prev => ({ ...prev, [empId]: Array(7).fill('off') as ShiftType[] }));
    toast('info', 'Empleado agregado al horario. Haz clic en los turnos para cambiarlos.');
  };

  const unscheduledEmps = employees.filter(e => !schedule[e.id] && e.status !== 'inactive');

  return (
    <>
      <Header title="Control de Horarios" subtitle="Semana del 24 al 30 de Marzo 2025 · Haz clic en un turno para cambiarlo" />

      <div className="flex-1 p-6 space-y-5 animate-fade-in-up">

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded-lg" style={{ background:'var(--zx-surface)', border:'1px solid var(--zx-border)' }}>
              <ChevronLeft size={14} style={{ color:'var(--zx-text-2)' }} />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background:'var(--zx-surface)', border:'1px solid var(--zx-border)', color:'var(--zx-text-1)' }}>
              <CalendarDays size={13} style={{ color:'var(--zx-accent)' }} />
              Semana 24–30 Marzo 2025
            </div>
            <button className="p-1.5 rounded-lg" style={{ background:'var(--zx-surface)', border:'1px solid var(--zx-border)' }}>
              <ChevronRight size={14} style={{ color:'var(--zx-text-2)' }} />
            </button>
          </div>
          <div className="flex-1" />
          <Button variant="secondary" size="sm" icon={<Plus size={13} />}
            onClick={() => {
              if (unscheduledEmps.length) addEmployeeToSchedule(unscheduledEmps[0].id);
              else toast('info', 'Todos los empleados activos ya tienen horario asignado.');
            }}>
            Agregar empleado
          </Button>
          <Button variant="primary" size="sm" icon={<CalendarDays size={13} />} onClick={() => setShowAssign(true)}>
            Asignar turno
          </Button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          {Object.entries(shiftMap).map(([key, val]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center"
                style={{ background: val.bg, color: val.color }}>
                {val.short}
              </span>
              <span className="text-[11px]" style={{ color:'var(--zx-text-3)' }}>{val.label}</span>
            </div>
          ))}
          <span className="text-[11px] ml-2" style={{ color:'var(--zx-text-3)' }}>· Haz clic en un turno para ciclar entre opciones</span>
        </div>

        {/* Grid */}
        <div className="rounded-xl overflow-hidden" style={{ background:'var(--zx-surface)', border:'1px solid var(--zx-border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[700px]">
              <thead>
                <tr style={{ borderBottom:'1px solid var(--zx-border)', background:'var(--zx-surface-2)' }}>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide w-44"
                    style={{ color:'var(--zx-text-3)', fontSize:'10px' }}>Empleado</th>
                  {DAYS.map(d => (
                    <th key={d} className="px-2 py-3 text-center font-semibold uppercase tracking-wide"
                      style={{ color:'var(--zx-text-3)', fontSize:'10px' }}>{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeEmps.map((emp, i) => {
                  const shifts = schedule[emp.id] ?? [];
                  return (
                    <tr key={emp.id}
                      style={{ borderBottom: i < activeEmps.length-1 ? '1px solid var(--zx-border)' : 'none' }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar initials={emp.initials} size="xs" />
                          <div>
                            <p className="font-medium" style={{ color:'var(--zx-text-1)' }}>
                              {emp.name.split(' ')[0]} {emp.name.split(' ').slice(-1)}
                            </p>
                            <p className="text-[10px]" style={{ color:'var(--zx-text-3)' }}>{emp.department}</p>
                          </div>
                        </div>
                      </td>
                      {shifts.map((shift, di) => {
                        const s = shiftMap[shift];
                        return (
                          <td key={di} className="px-2 py-3 text-center">
                            <button
                              onClick={() => cycleDayShift(emp.id, di)}
                              title={`Cambiar turno — actual: ${s.label}`}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[11px] font-bold transition-all hover:scale-110 hover:shadow-lg"
                              style={{ background: s.bg, color: s.color }}>
                              {s.short}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label:'Turnos completos', value:Object.values(schedule).flat().filter(s=>s==='full').length,    color:'var(--zx-success)' },
            { label:'Días remotos',     value:Object.values(schedule).flat().filter(s=>s==='remote').length,  color:'var(--zx-accent)' },
            { label:'Días libres',      value:Object.values(schedule).flat().filter(s=>s==='off').length,     color:'var(--zx-text-3)' },
            { label:'Turnos nocturnos', value:Object.values(schedule).flat().filter(s=>s==='night').length,   color:'var(--zx-accent)' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3" style={{ background:'var(--zx-surface)', border:'1px solid var(--zx-border)' }}>
              <p className="text-2xl font-bold tabular-nums" style={{ color:s.color }}>{s.value}</p>
              <p className="text-[11px] mt-0.5" style={{ color:'var(--zx-text-3)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Assign Shift Modal */}
      <Modal open={showAssign} onClose={() => setShowAssign(false)} title="Asignar turno" size="sm">
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>Empleado</label>
            <select value={form.employeeId} onChange={e => setForm(f => ({...f, employeeId: e.target.value}))}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-1)' }}>
              {employees.filter(e => e.status !== 'inactive').map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>Día</label>
            <select value={form.dayIdx} onChange={e => setForm(f => ({...f, dayIdx: Number(e.target.value)}))}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background:'var(--zx-surface-2)', border:'1px solid var(--zx-border-2)', color:'var(--zx-text-1)' }}>
              {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-medium block mb-1" style={{ color:'var(--zx-text-3)' }}>Tipo de turno</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(shiftMap) as [ShiftType, typeof shiftMap[ShiftType]][]).map(([key, val]) => (
                <button key={key} onClick={() => setForm(f => ({...f, shift: key}))}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg transition-all"
                  style={{
                    background: form.shift === key ? val.bg : 'var(--zx-surface-2)',
                    border: `1px solid ${form.shift === key ? val.color : 'var(--zx-border)'}`,
                  }}>
                  <span className="w-6 h-6 rounded flex items-center justify-center text-[11px] font-bold"
                    style={{ background: val.bg, color: val.color }}>{val.short}</span>
                  <span className="text-[9px]" style={{ color: form.shift === key ? val.color : 'var(--zx-text-3)' }}>
                    {val.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="primary" className="flex-1 justify-center" onClick={assignShift}>
              Asignar turno
            </Button>
            <Button variant="secondary" onClick={() => setShowAssign(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
