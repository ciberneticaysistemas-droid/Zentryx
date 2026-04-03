'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type UploadState = 'idle' | 'dragging' | 'uploading' | 'processing' | 'done' | 'error';

interface UploadZoneProps {
  label?: string;
  accept?: string;
  onFileSelected?: (file: File) => void;
  processingLabel?: string;
  className?: string;
}

export default function UploadZone({
  label = 'Arrastra tu archivo aquí o haz clic para seleccionar',
  accept = '.pdf,.jpg,.jpeg,.png',
  onFileSelected,
  processingLabel = 'La IA está analizando el documento...',
  className,
}: UploadZoneProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [progress, setProgress]   = useState(0);
  const [fileName, setFileName]   = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setFileName(file.name);
    setState('uploading');
    setProgress(0);

    // Simulate upload
    const uploadInterval = setInterval(() => {
      setProgress(p => {
        if (p >= 40) { clearInterval(uploadInterval); setState('processing'); simulateProcessing(); return 40; }
        return p + 8;
      });
    }, 120);
  };

  const simulateProcessing = () => {
    let p = 40;
    const interval = setInterval(() => {
      p += Math.random() * 12 + 3;
      setProgress(Math.min(p, 98));
      if (p >= 98) {
        clearInterval(interval);
        setTimeout(() => { setProgress(100); setState('done'); }, 400);
      }
    }, 300);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setState('idle');
    const file = e.dataTransfer.files[0];
    if (file) { handleFile(file); onFileSelected?.(file); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { handleFile(file); onFileSelected?.(file); }
  };

  const reset = () => { setState('idle'); setProgress(0); setFileName(''); };

  const isDragging  = state === 'dragging';
  const isActive    = state === 'uploading' || state === 'processing';
  const isDone      = state === 'done';

  return (
    <div className={cn('relative', className)}>
      <input ref={inputRef} type="file" accept={accept} className="sr-only" onChange={handleChange} />

      <div
        onClick={() => state === 'idle' && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); if (state === 'idle') setState('dragging'); }}
        onDragLeave={() => setState('idle')}
        onDrop={handleDrop}
        className={cn('relative flex flex-col items-center justify-center gap-3 rounded-xl p-8 text-center transition-all duration-300',
          state === 'idle' && 'cursor-pointer',
        )}
        style={{
          background:   isDragging ? 'var(--zx-accent-muted)' : isDone ? 'var(--zx-success-muted)' : 'var(--zx-surface-2)',
          border:       `2px dashed ${isDragging ? 'var(--zx-accent)' : isDone ? 'var(--zx-success)' : 'var(--zx-border-2)'}`,
        }}
      >
        {/* Icon */}
        {isDone ? (
          <CheckCircle size={32} style={{ color: 'var(--zx-success)' }} />
        ) : isActive ? (
          <Loader2 size={32} className="animate-spin-slow" style={{ color: 'var(--zx-accent)' }} />
        ) : (
          <div className="flex items-center justify-center w-12 h-12 rounded-full"
            style={{ background: isDragging ? 'var(--zx-accent)' : 'var(--zx-surface-3)' }}>
            <Upload size={20} style={{ color: isDragging ? '#09090B' : 'var(--zx-accent)' }} />
          </div>
        )}

        {/* Label */}
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--zx-text-1)' }}>
            {isDone ? `${fileName} analizado exitosamente` :
             isActive ? processingLabel :
             isDragging ? 'Suelta el archivo aquí' : label}
          </p>
          {state === 'idle' && (
            <p className="text-xs mt-1" style={{ color: 'var(--zx-text-3)' }}>
              PDF, JPG, PNG — máx. 10 MB
            </p>
          )}
          {fileName && !isDone && (
            <div className="flex items-center gap-1.5 mt-2 justify-center">
              <FileText size={12} style={{ color: 'var(--zx-accent)' }} />
              <span className="text-xs" style={{ color: 'var(--zx-accent)' }}>{fileName}</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {isActive && (
          <div className="w-full max-w-xs">
            <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--zx-text-3)' }}>
              <span>{state === 'uploading' ? 'Subiendo archivo...' : 'Procesando con IA...'}</span>
              <span className="animate-pulse-gold" style={{ color: 'var(--zx-accent)' }}>{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--zx-surface-3)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, var(--zx-accent), var(--zx-accent-hover))',
                  boxShadow: '0 0 8px var(--zx-accent-muted)',
                }}
              />
            </div>
          </div>
        )}

        {isDone && (
          <button onClick={e => { e.stopPropagation(); reset(); }}
            className="text-xs px-3 py-1 rounded-md transition-colors"
            style={{ background: 'var(--zx-surface-3)', color: 'var(--zx-text-2)' }}>
            Cargar otro archivo
          </button>
        )}
      </div>
    </div>
  );
}
