"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { 
  Users, 
  Award, 
  Code, 
  TrendingUp, 
  Clock,
  CheckCircle,
  BarChart3,
  MessageCircle,
  RefreshCw
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalParticipants: 0,
    totalSessions: 0,
    completedSessions: 0,
    averageScore: 0,
    totalCodes: 0,
    activeCodes: 0,
    totalWhatsappMessages: 0,
  });
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    checkUser();
    loadStats();
    loadRecentSessions();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    setLoading(false);
  };

  const loadStats = async () => {
    try {
      // Total participants
      const { count: participantsCount } = await supabase
        .from("participants")
        .select("*", { count: "exact", head: true });

      // Total sessions
      const { count: sessionsCount } = await supabase
        .from("sessions")
        .select("*", { count: "exact", head: true });

      // Sessions complétées
      const { count: completedCount } = await supabase
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed");

      // Score moyen
      const { data: sessionsData } = await supabase
        .from("sessions")
        .select("score")
        .eq("status", "completed")
        .not("score", "is", null);

      const averageScore = sessionsData && sessionsData.length > 0
        ? Math.round(sessionsData.reduce((sum, s) => sum + (s.score || 0), 0) / sessionsData.length)
        : 0;

      // Total codes
      const { count: codesCount } = await supabase
        .from("access_codes")
        .select("*", { count: "exact", head: true });

      // Codes actifs
      const { count: activeCodesCount } = await supabase
        .from("access_codes")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Messages WhatsApp
      const { count: messagesCount } = await supabase
        .from("whatsapp_messages")
        .select("*", { count: "exact", head: true });

      setStats({
        totalParticipants: participantsCount || 0,
        totalSessions: sessionsCount || 0,
        completedSessions: completedCount || 0,
        averageScore,
        totalCodes: codesCount || 0,
        activeCodes: activeCodesCount || 0,
        totalWhatsappMessages: messagesCount || 0,
      });
    } catch (err) {
      console.error("Erreur chargement stats:", err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadStats(), loadRecentSessions()]);
    setRefreshing(false);
  };

  const loadRecentSessions = async () => {
    try {
      const { data } = await supabase
        .from("sessions")
        .select(`
          id,
          score,
          status,
          completed_at,
          participants (
            name
          ),
          access_codes (
            code,
            label
          )
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      if (data) {
        setRecentSessions(data);
      }
    } catch (err) {
      console.error("Erreur chargement sessions:", err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/admin/login";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Chargement...</div>
      </div>
    );
  }

  const statCards = [
    {
      icon: Users,
      label: "Participants",
      value: stats.totalParticipants,
      color: "blue",
      link: "/admin/results",
    },
    {
      icon: CheckCircle,
      label: "Sessions complétées",
      value: stats.completedSessions,
      color: "green",
    },
    {
      icon: Award,
      label: "Score moyen",
      value: `${stats.averageScore}%`,
      color: "purple",
    },
    {
      icon: Code,
      label: "Codes actifs",
      value: `${stats.activeCodes} / ${stats.totalCodes}`,
      color: "indigo",
      link: "/admin/codes",
    },
    {
      icon: MessageCircle,
      label: "Messages WhatsApp",
      value: stats.totalWhatsappMessages,
      color: "green",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord Admin</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
              title="Actualiser"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <span className="text-gray-600 text-sm">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Actions rapides */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/admin/codes">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Code className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Gérer les codes</h3>
                  <p className="text-sm text-gray-600">Créer et modifier les codes d'accès</p>
                </div>
              </div>
            </motion.div>
          </Link>

          <Link href="/admin/results">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Voir les résultats</h3>
                  <p className="text-sm text-gray-600">Analyser les résultats par code</p>
                </div>
              </div>
            </motion.div>
          </Link>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Statistiques</h3>
                <p className="text-sm text-gray-600">Vue d'ensemble ci-dessous</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {statCards.map((stat, i) => {
            const StatIcon = stat.icon;
            const colorClasses = {
              blue: "bg-blue-100 text-blue-600",
              green: "bg-green-100 text-green-600",
              purple: "bg-purple-100 text-purple-600",
              indigo: "bg-indigo-100 text-indigo-600",
            };

            const content = (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`bg-white rounded-lg shadow p-6 border border-gray-100 ${stat.link ? "cursor-pointer hover:shadow-lg hover:border-indigo-300 transition-all" : ""}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                    <StatIcon className="w-6 h-6" />
                  </div>
                  {stat.link && (
                    <div className="text-gray-400 group-hover:text-indigo-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </motion.div>
            );

            if (stat.link) {
              return (
                <Link key={i} href={stat.link} className="group">
                  {content}
                </Link>
              );
            }

            return <div key={i}>{content}</div>;
          })}
        </div>

        {/* Sessions récentes */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Sessions récentes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Participant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentSessions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      Aucune session pour le moment
                    </td>
                  </tr>
                ) : (
                  recentSessions.map((session: any) => (
                    <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-indigo-600 font-semibold text-xs">
                              {session.participants?.name?.charAt(0).toUpperCase() || "?"}
                            </span>
                          </div>
                          <span className="text-gray-900 font-medium">
                            {session.participants?.name || "N/A"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm font-bold text-indigo-600">
                          {session.access_codes?.code || "N/A"}
                        </span>
                        {session.access_codes?.label && (
                          <div className="text-xs text-gray-500 mt-1">
                            {session.access_codes.label}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            session.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {session.status === "completed" ? "Complété" : "En cours"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {session.score !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  session.score >= 80
                                    ? "bg-green-500"
                                    : session.score >= 50
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                                }`}
                                style={{ width: `${session.score}%` }}
                              />
                            </div>
                            <span className="text-gray-900 font-semibold">{session.score}%</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {session.completed_at
                          ? new Date(session.completed_at).toLocaleDateString("fr-FR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : new Date(session.created_at || "").toLocaleDateString("fr-FR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
