import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Assistant = Database['public']['Tables']['assistants']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];

async function getAdminStats() {
  const supabase = await createClient();

  // Get total users
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  // Get total assistants
  const { count: totalAssistants } = await supabase
    .from('assistants')
    .select('*', { count: 'exact', head: true });

  // Get total messages
  const { count: totalMessages } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true });

  // Get active assistants
  const { count: activeAssistants } = await supabase
    .from('assistants')
    .select('*', { count: 'exact', head: true })
    .eq('active', true);

  // Get recent users (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { count: recentUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgo.toISOString());

  // Get messages per assistant
  const { data: messagesPerAssistant } = await supabase
    .from('messages')
    .select('assistant_id, assistants(name)')
    .eq('role', 'user');

  // Count messages per assistant
  const assistantMessageCounts: Record<string, number> = {};
  messagesPerAssistant?.forEach((msg: any) => {
    const name = msg.assistants?.name || 'Unknown';
    assistantMessageCounts[name] = (assistantMessageCounts[name] || 0) + 1;
  });

  return {
    totalUsers: totalUsers || 0,
    totalAssistants: totalAssistants || 0,
    totalMessages: totalMessages || 0,
    activeAssistants: activeAssistants || 0,
    recentUsers: recentUsers || 0,
    assistantMessageCounts,
  };
}

export default async function AdminDashboard() {
  const stats = await getAdminStats();

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Dashboard
        </h2>
        <p className="text-gray-600">Overview of your AI assistant system</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white/80 backdrop-blur-lg overflow-hidden shadow-lg rounded-2xl border border-purple-100">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-shrink-0 h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 px-6 py-3 border-t border-purple-100">
            <div className="text-sm flex items-center justify-between">
              <span className="text-gray-600">Last 7 days</span>
              <span className="font-semibold text-blue-600">+{stats.recentUsers}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-lg overflow-hidden shadow-lg rounded-2xl border border-purple-100">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-shrink-0 h-12 w-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-600">Assistants</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalAssistants}</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 px-6 py-3 border-t border-purple-100">
            <div className="text-sm flex items-center justify-between">
              <span className="text-gray-600">Active</span>
              <span className="font-semibold text-purple-600">{stats.activeAssistants}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-lg overflow-hidden shadow-lg rounded-2xl border border-purple-100">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-shrink-0 h-12 w-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-600">Messages</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalMessages}</p>
              </div>
            </div>
          </div>
          <div className="bg-pink-50 px-6 py-3 border-t border-purple-100">
            <div className="text-sm text-gray-600">
              All conversations
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-lg overflow-hidden shadow-lg rounded-2xl border border-purple-100">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-shrink-0 h-12 w-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-600">Avg per User</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.totalUsers > 0 ? Math.round(stats.totalMessages / stats.totalUsers) : 0}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-indigo-50 px-6 py-3 border-t border-purple-100">
            <div className="text-sm text-gray-600">
              Messages per user
            </div>
          </div>
        </div>
      </div>

      {/* Assistant Usage */}
      <div className="mt-8">
        <div className="bg-white/80 backdrop-blur-lg shadow-lg rounded-2xl border border-purple-100">
          <div className="px-6 py-5 border-b border-purple-100">
            <h3 className="text-xl font-bold text-gray-900">
              Assistant Usage
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Number of user messages per assistant
            </p>
          </div>
          <div className="px-6 py-6">
            {Object.keys(stats.assistantMessageCounts).length > 0 ? (
              <div className="space-y-5">
                {Object.entries(stats.assistantMessageCounts).map(([name, count]) => (
                  <div key={name}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-semibold text-gray-900">{name}</span>
                      <span className="text-gray-600">{count} messages</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                        style={{
                          width: `${(count / Math.max(...Object.values(stats.assistantMessageCounts))) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No message data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <a
            href="/admin/users"
            className="group relative block w-full bg-white/80 backdrop-blur-lg border-2 border-purple-200 rounded-2xl p-8 text-center hover:border-purple-400 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
          >
            <div className="mx-auto h-16 w-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <span className="mt-4 block text-base font-semibold text-gray-900">
              Manage Users
            </span>
          </a>

          <a
            href="/admin/assistants"
            className="group relative block w-full bg-white/80 backdrop-blur-lg border-2 border-purple-200 rounded-2xl p-8 text-center hover:border-purple-400 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
          >
            <div className="mx-auto h-16 w-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="mt-4 block text-base font-semibold text-gray-900">
              Manage Assistants
            </span>
          </a>

          <a
            href="/admin/messages"
            className="group relative block w-full bg-white/80 backdrop-blur-lg border-2 border-purple-200 rounded-2xl p-8 text-center hover:border-purple-400 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
          >
            <div className="mx-auto h-16 w-16 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <span className="mt-4 block text-base font-semibold text-gray-900">
              View Messages
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
