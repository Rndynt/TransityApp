import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  sticky?: boolean;
  rightContent?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export default function PageHeader({ title, subtitle, onBack, sticky, rightContent, children, className }: PageHeaderProps) {
  return (
    <div className={cn(
      'hero-mesh px-4 pt-3 pb-4',
      sticky && 'sticky top-0 z-30',
      className,
    )}>
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors shrink-0"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-bold text-[16px] font-display truncate">{title}</h1>
          {subtitle && (
            <p className="text-teal-300/80 text-[12px] mt-0.5 font-medium truncate">{subtitle}</p>
          )}
        </div>
        {rightContent}
      </div>
      {children}
    </div>
  );
}
