import { useState } from 'react';
import { useAuth, useNav } from '@/App';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Mail, Phone, Calendar, LogOut, HelpCircle, Info, Bell, ChevronRight, Shield, Lock, Loader2, Pencil, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export default function ProfilePage() {
  const { user, logout, login } = useAuth();
  const { navigate, goBack } = useNav();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  if (!user) {
    return null;
  }

  let joinDate = '';
  try {
    joinDate = format(parseISO(user.createdAt), 'd MMMM yyyy', { locale: idLocale });
  } catch { joinDate = user.createdAt; }

  const initials = user.fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const handleChangePassword = async () => {
    setPwError('');
    setPwSuccess('');
    if (!currentPassword || !newPassword) { setPwError('Semua field wajib diisi'); return; }
    if (newPassword.length < 6) { setPwError('Password baru minimal 6 karakter'); return; }
    setPwLoading(true);
    try {
      const res = await authApi.changePassword({ currentPassword, newPassword });
      setPwSuccess(res.message || 'Password berhasil diubah');
      setCurrentPassword('');
      setNewPassword('');
    } catch (e: unknown) {
      setPwError(e instanceof Error ? e.message : 'Gagal mengubah password');
    } finally {
      setPwLoading(false);
    }
  };

  const openEditProfile = () => {
    setEditName(user.fullName);
    setEditPhone(user.phone || '');
    setEditError('');
    setShowEditProfile(true);
  };

  const handleEditProfile = async () => {
    setEditError('');
    const updates: { fullName?: string; phone?: string } = {};
    if (editName.trim() && editName.trim() !== user.fullName) updates.fullName = editName.trim();
    if (editPhone.trim() !== (user.phone || '')) updates.phone = editPhone.trim();
    if (Object.keys(updates).length === 0) { setShowEditProfile(false); return; }
    setEditLoading(true);
    try {
      const updated = await authApi.updateProfile(updates);
      const { store } = await import('@/lib/api');
      login(updated, store.getToken()!);
      setShowEditProfile(false);
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : 'Gagal memperbarui profil');
    } finally {
      setEditLoading(false);
    }
  };

  const menuItems = [
    { icon: Lock, label: 'Ubah Password', action: () => { setPwError(''); setPwSuccess(''); setCurrentPassword(''); setNewPassword(''); setShowChangePassword(true); }, color: 'text-violet-500', bg: 'bg-violet-50' },
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
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full rounded-2xl object-cover" />
            ) : (
              <span className="text-[24px] font-bold text-white">{initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[20px] text-white truncate">{user.fullName}</p>
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
          <button
            onClick={openEditProfile}
            className="w-full flex items-center justify-center gap-2 py-3 border-t border-slate-100 hover:bg-slate-50 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5 text-teal-600" />
            <span className="text-[13px] font-semibold text-teal-600">Edit Profil</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-soft overflow-hidden mb-4">
          {menuItems.map((item, i) => (
            <button
              key={item.label}
              onClick={() => 'action' in item && item.action ? item.action() : 'page' in item && item.page ? navigate({ name: item.page }) : undefined}
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

      {showChangePassword && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/40 anim-fade" onClick={() => setShowChangePassword(false)} />
          <div className="fixed inset-x-0 bottom-0 z-[70] bg-white rounded-t-[1.5rem] p-6 anim-slide-up safe-bottom">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[17px] font-bold text-slate-800">Ubah Password</h3>
              <button onClick={() => setShowChangePassword(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-[11px] text-slate-400 font-semibold mb-1 block">Password Lama</Label>
                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Masukkan password lama"
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50/50 text-[14px] font-medium placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600/40 transition-all" />
              </div>
              <div>
                <Label className="text-[11px] text-slate-400 font-semibold mb-1 block">Password Baru</Label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minimal 6 karakter"
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50/50 text-[14px] font-medium placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600/40 transition-all" />
              </div>
            </div>
            {pwError && <p className="text-[13px] text-red-500 font-medium mt-3">{pwError}</p>}
            {pwSuccess && <p className="text-[13px] text-green-600 font-medium mt-3">{pwSuccess}</p>}
            <Button
              className="w-full mt-4 h-12 rounded-2xl bg-teal-900 hover:bg-teal-950 text-[14px] font-bold"
              onClick={handleChangePassword}
              disabled={pwLoading}
            >
              {pwLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Simpan Password
            </Button>
          </div>
        </>
      )}

      {showEditProfile && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/40 anim-fade" onClick={() => setShowEditProfile(false)} />
          <div className="fixed inset-x-0 bottom-0 z-[70] bg-white rounded-t-[1.5rem] p-6 anim-slide-up safe-bottom">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[17px] font-bold text-slate-800">Edit Profil</h3>
              <button onClick={() => setShowEditProfile(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-[11px] text-slate-400 font-semibold mb-1 block">Nama Lengkap</Label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nama lengkap"
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50/50 text-[14px] font-medium placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600/40 transition-all" />
              </div>
              <div>
                <Label className="text-[11px] text-slate-400 font-semibold mb-1 block">No. HP</Label>
                <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="08xxxxxxxxxx"
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50/50 text-[14px] font-medium placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600/40 transition-all" />
              </div>
            </div>
            {editError && <p className="text-[13px] text-red-500 font-medium mt-3">{editError}</p>}
            <Button
              className="w-full mt-4 h-12 rounded-2xl bg-teal-900 hover:bg-teal-950 text-[14px] font-bold"
              onClick={handleEditProfile}
              disabled={editLoading}
            >
              {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Simpan Perubahan
            </Button>
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
