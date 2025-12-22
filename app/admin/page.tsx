import { createServiceClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';
import HorizontalBarChart from './components/HorizontalBarChart';

// Force dynamic rendering and no caching for admin dashboard
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Profile = Database['public']['Tables']['profiles']['Row'];
type Assistant = Database['public']['Tables']['assistants']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];

async function getAdminStats() {
  const supabase = createServiceClient();

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

  // Get assistant distribution (users per assistant)
  const { data: assistantAssignments } = await supabase
    .from('user_assistant')
    .select('assistant_id, assistants(name)');

  const usersPerAssistant: Record<string, number> = {};
  assistantAssignments?.forEach((assignment: any) => {
    const name = assignment.assistants?.name || 'Unknown';
    usersPerAssistant[name] = (usersPerAssistant[name] || 0) + 1;
  });

  // Get user engagement levels (only authenticated user messages, not public messages)
  const { data: userMessageCounts } = await supabase
    .from('messages')
    .select('user_id')
    .eq('role', 'user')
    .not('user_id', 'is', null) as { data: { user_id: string }[] | null };

  const messagesPerUser: Record<string, number> = {};
  userMessageCounts?.forEach((msg) => {
    const userId = msg.user_id;
    if (userId) {
      messagesPerUser[userId] = (messagesPerUser[userId] || 0) + 1;
    }
  });

  const engagement = {
    highlyActive: Object.values(messagesPerUser).filter(count => count >= 20).length,
    moderatelyActive: Object.values(messagesPerUser).filter(count => count >= 5 && count < 20).length,
    lowActivity: Object.values(messagesPerUser).filter(count => count > 0 && count < 5).length,
  };

  return {
    totalUsers: totalUsers || 0,
    totalAssistants: totalAssistants || 0,
    totalMessages: totalMessages || 0,
    activeAssistants: activeAssistants || 0,
    recentUsers: recentUsers || 0,
    usersPerAssistant,
    engagement,
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

      {/* Research Study Insights */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assistant Distribution (Critical for Research) */}
        <div className="bg-white/80 backdrop-blur-lg shadow-lg rounded-2xl border border-purple-100">
          <div className="px-6 py-5 border-b border-purple-100">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              Assistant Distribution
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                Research Critical
              </span>
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Users assigned to each assistant (should be balanced)
            </p>
          </div>
          <div className="px-6 py-6">
            {Object.keys(stats.usersPerAssistant).length > 0 ? (
              <>
                <HorizontalBarChart data={stats.usersPerAssistant} color="green" />
                <div className="pt-4 border-t border-gray-200 mt-6">
                  {(() => {
                    const counts = Object.values(stats.usersPerAssistant);
                    const max = Math.max(...counts);
                    const min = Math.min(...counts);
                    const diff = max - min;
                    const isBalanced = diff <= 1;

                    return (
                      <div className={`p-3 rounded-lg ${isBalanced ? 'bg-green-50' : 'bg-yellow-50'}`}>
                        <p className="text-sm">
                          {isBalanced ? (
                            <span className="text-green-800 font-medium flex items-center gap-2">
                              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Balanced distribution (difference: {diff})
                            </span>
                          ) : (
                            <span className="text-yellow-800 font-medium flex items-center gap-2">
                              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              Unbalanced (difference: {diff})
                            </span>
                          )}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </>
            ) : (
              <p className="text-gray-500 text-center py-4">No assistant assignments yet</p>
            )}
          </div>
        </div>

        {/* User Engagement Levels */}
        <div className="bg-white/80 backdrop-blur-lg shadow-lg rounded-2xl border border-purple-100">
          <div className="px-6 py-5 border-b border-purple-100">
            <h3 className="text-xl font-bold text-gray-900">
              User Engagement Levels
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Categorized by message activity
            </p>
          </div>
          <div className="px-6 py-6">
            <HorizontalBarChart
              data={{
                'Highly Active (20+ messages)': stats.engagement.highlyActive,
                'Moderately Active (5-19 messages)': stats.engagement.moderatelyActive,
                'Low Activity (1-4 messages)': stats.engagement.lowActivity,
              }}
              color="blue"
              showPercentage={true}
              total={stats.totalUsers}
            />
            <div className="pt-4 border-t border-gray-200 mt-6">
              <p className="text-sm text-gray-600">
                Engagement Rate: <span className="font-semibold text-gray-900">
                  {stats.totalUsers > 0
                    ? Math.round(((stats.engagement.highlyActive + stats.engagement.moderatelyActive) / stats.totalUsers) * 100)
                    : 0}%
                </span> (active/moderate users)
              </p>
            </div>
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
