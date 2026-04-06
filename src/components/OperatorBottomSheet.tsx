import { useState, useEffect, useRef } from 'react';
import { Search, X, CheckCircle2, Bus } from 'lucide-react';
import { cn } from '@/lib/utils';
import OperatorLogo from '@/components/OperatorLogo';
import type { OperatorInfo } from '@/lib/api';

interface Props {
  open: boolean;
  operators: OperatorInfo[];
  selected: string | null;
  onSelect: (slug: string | null) => void;
  onClose: () => void;
}

export default function OperatorBottomSheet({ open, operators, selected, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const filtered = operators.filter((op) =>
    op.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (slug: string | null) => {
    onSelect(slug);
    onClose();
  };

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-[70] bg-white rounded-t-[1.5rem] transition-transform duration-300 ease-out shadow-[0_-4px_30px_rgba(0,0,0,0.12)]',
          'max-h-[85vh] flex flex-col pb-20',
          open ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        <div className="flex items-center justify-between px-5 pb-3">
          <h2 className="text-[16px] font-bold text-slate-800">Pilih Operator</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {operators.length > 5 && (
          <div className="px-5 pb-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-300 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Cari operator..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-[14px] placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600/40 transition-all"
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto overscroll-contain pb-8">
          <button
            onClick={() => handleSelect(null)}
            className={cn(
              'w-full flex items-center gap-3.5 px-5 py-3.5 transition-colors text-left',
              selected === null ? 'bg-teal-50/80' : 'hover:bg-slate-50 active:bg-slate-100'
            )}
          >
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
              selected === null ? 'bg-teal-600' : 'bg-slate-100'
            )}>
              <Bus className={cn('w-5 h-5', selected === null ? 'text-white' : 'text-slate-400')} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn('text-[14px] font-semibold', selected === null ? 'text-teal-800' : 'text-slate-800')}>Semua Operator</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Tampilkan dari semua operator</p>
            </div>
            {selected === null && <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />}
          </button>

          {filtered.length === 0 && query && (
            <div className="flex flex-col items-center py-10 gap-2">
              <Bus className="w-10 h-10 text-slate-200" />
              <p className="text-[13px] text-slate-400">Operator tidak ditemukan</p>
            </div>
          )}

          {filtered.map((op) => (
            <button
              key={op.slug}
              onClick={() => handleSelect(op.slug)}
              className={cn(
                'w-full flex items-center gap-3.5 px-5 py-3.5 transition-colors text-left',
                selected === op.slug ? 'bg-teal-50/80' : 'hover:bg-slate-50 active:bg-slate-100'
              )}
            >
              <OperatorLogo name={op.name} logo={op.logo} color={op.color} size="md" />
              <div className="flex-1 min-w-0">
                <p className={cn('text-[14px] font-semibold', selected === op.slug ? 'text-teal-800' : 'text-slate-800')}>{op.name}</p>
              </div>
              {selected === op.slug && <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
