import { useState } from 'react';
import { useAuth, useNav } from '@/App';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UserCircle2, Mail, Phone, Calendar, LogOut, HelpCircle, Info, Bell, ChevronRight, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { navigate, goBack } = useNav();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (!user) {
    return null;
  }

  let joinDate = '';
  try {
    joinDate = format(parseISO(user.createdAt), 'd MMMM yyyy', { locale: idLocale });
  } catch { joinDate = user.createdAt; }

  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const menuItems = [
    { icon: Bell, label: 'Notifikasi', page: 'notifications' as const, color: 'text-amber-500', bg: 'bg-amber-50' },
    { icon: HelpCircle, label: 'Bantuan & FAQ', page: 'help' as const, color: 'text-blue-500', bg: 'bg-blue-50' },
    { icon: Info, label: 'Tentang Aplikasi', page: 'about' as const, color: 'text-teal-600', bg: 'bg-teal-50' },
  ];

  return (
    <div className="anim-fade min-h-screen bg-slate-50 pb-28">
      <div className="hero-mesh px-4 pt-3 pb-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={goBack} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-[17px] font-bold text-white">Profil Saya</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-[72px] h-[72px] rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full rounded-2xl object-cover" />
            ) : (
              <span className="text-[24px] font-bold text-white">{initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[20px] text-white truncate">{user.name}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Shield className="w-3.5 h-3.5 text-teal-300" />
              <span className="text-[12px] font-medium text-teal-200">Member Aktif</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4">
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden mb-4">
          <div className="p-4 space-y-3">
            <InfoRow icon={Mail} label="Email" value={user.email} />
            <InfoRow icon={Phone} label="No. HP" value={user.phone || 'Belum diisi'} muted={!user.phone} />
            <InfoRow icon={Calendar} label="Bergabung" value={joinDate} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-soft overflow-hidden mb-4">
          {menuItems.map((item, i) => (
            <button
              key={item.page}
              onClick={() => navigate({ name: item.page })}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors',
                i < menuItems.length - 1 && 'border-b border-slate-50',
              )}
            >
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', item.bg)}>
                <item.icon className={cn('w-[18px] h-[18px]', item.color)} />
              </div>
              <span className="flex-1 text-left text-[14px] font-medium text-slate-700">{item.label}</span>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-red-50/50 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <LogOut className="w-[18px] h-[18px] text-red-500" />
            </div>
            <span className="flex-1 text-left text-[14px] font-medium text-red-500">Keluar dari Akun</span>
          </button>
        </div>
      </div>

      {showLogoutConfirm && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/40 anim-fade" onClick={() => setShowLogoutConfirm(false)} />
          <div className="fixed inset-x-0 bottom-0 z-[70] bg-white rounded-t-[1.5rem] p-6 anim-slide-up safe-bottom">
            <h3 className="text-[17px] font-bold text-slate-800 mb-2">Keluar dari Akun?</h3>
            <p className="text-[13px] text-slate-500 mb-5">Kamu harus login kembali untuk memesan tiket.</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-2xl text-[14px] font-bold"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Batal
              </Button>
              <Button
                className="flex-1 h-12 rounded-2xl bg-red-500 hover:bg-red-600 text-[14px] font-bold"
                onClick={() => { logout(); navigate({ name: 'home' }); }}
              >
                Ya, Keluar
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, muted }: {
  icon: typeof Mail; label: string; value: string; muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-[18px] h-[18px] text-slate-300 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-slate-400 font-medium">{label}</p>
        <p className={cn('text-[14px] font-medium truncate', muted ? 'text-slate-300 italic' : 'text-slate-700')}>{value}</p>
      </div>
    </div>
  );
}
