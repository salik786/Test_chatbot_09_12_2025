import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUserProfile } from '@/lib/db/users';
import AdminSidebar from './components/AdminSidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await getUserProfile(user.id);

  if (!profile?.is_admin) {
    redirect('/chat');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <AdminSidebar userEmail={profile.email || ''} />

      {/* Main Content */}
      <div className="lg:pl-64">
        <main className="p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
