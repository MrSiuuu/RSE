"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { ArrowLeft, Code, Users, Award, Calendar, Search } from "lucide-react";
import Link from "next/link";

type SessionResult = {
  id: string;
  score: number;
  completed_at: string;
  participants: { name: string }[];
  access_codes: { code: string; label: string | null }[];
};

export default function AdminResultsPage() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionResult[]>([]);
  const [codes, setCodes] = useState<any[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkUser();
    loadCodes();
  }, []);

  useEffect(() => {
    loadSessions();
  }, [selectedCode]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/admin/login");
    }
  };

  const loadCodes = async () => {
    const { data } = await supabase
      .from("access_codes")
      .select("id, code, label")
      .order("created_at", { ascending: false });

    if (data) {
      setCodes(data);
    }
  };

  const loadSessions = async () => {
    setLoading(true);
    try {
      let query = supabase
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
        .eq("status", "completed")
        .order("completed_at", { ascending: false });

      if (selectedCode !== "all") {
        query = query.eq("access_code_id", selectedCode);
      }

      const { data } = await query;

      if (data) {
        setSessions(data as SessionResult[]);
      }
    } catch (err) {
      console.error("Erreur chargement sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = sessions.filter((session) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const participantName = session.participants?.[0]?.name || "";
    const accessCode = session.access_codes?.[0]?.code || "";
    const accessLabel = session.access_codes?.[0]?.label || "";
    return (
      participantName.toLowerCase().includes(searchLower) ||
      accessCode.toLowerCase().includes(searchLower) ||
      (accessLabel && accessLabel.toLowerCase().includes(searchLower))
    );
  });

  // Statistiques par code
  const statsByCode = codes.map((code) => {
    const codeSessions = sessions.filter(
      (s: any) => s.access_codes?.[0]?.code === code.code
    );
    const averageScore =
      codeSessions.length > 0
        ? Math.round(
            codeSessions.reduce((sum: number, s: any) => sum + (s.score || 0), 0) /
              codeSessions.length
          )
        : 0;

    return {
      code: code.code,
      label: code.label,
      count: codeSessions.length,
      averageScore,
    };
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/admin/dashboard">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Retour
            </motion.button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Résultats des participants</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filtres */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrer par code
              </label>
              <select
                value={selectedCode}
                onChange={(e) => setSelectedCode(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
              >
                <option value="all">Tous les codes</option>
                {codes.map((code) => (
                  <option key={code.id} value={code.id}>
                    {code.code} {code.label ? `- ${code.label}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rechercher
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nom, code..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stats par code */}
        {selectedCode === "all" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {statsByCode
              .filter((stat) => stat.count > 0)
              .map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-lg shadow p-6"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Code className="w-5 h-5 text-indigo-600" />
                      <span className="font-mono font-bold text-indigo-600">{stat.code}</span>
                    </div>
                    <span className="text-sm text-gray-600">{stat.label || ""}</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {stat.count} participant{stat.count > 1 ? "s" : ""}
                  </div>
                  <div className="text-sm text-gray-600">
                    Score moyen : <span className="font-semibold">{stat.averageScore}%</span>
                  </div>
                </motion.div>
              ))}
          </div>
        )}

        {/* Liste des sessions */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">
              {selectedCode === "all"
                ? `Toutes les sessions (${filteredSessions.length})`
                : `Sessions pour ce code (${filteredSessions.length})`}
            </h2>
          </div>

          {filteredSessions.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg mb-2">Aucune session complétée</p>
              <p className="text-gray-500 text-sm">
                Les résultats apparaîtront ici une fois que les participants auront terminé le module.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Participant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code d'accès
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Profil RSE
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSessions.map((session) => {
                    const yesCount = Math.round((session.score / 100) * 5);
                    const profile =
                      yesCount <= 1
                        ? { label: "Curieux", color: "blue" }
                        : yesCount <= 3
                        ? { label: "Engagé débutant", color: "green" }
                        : { label: "RSE sans le savoir", color: "purple" };

                    return (
                      <tr key={session.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                              <span className="text-indigo-600 font-semibold">
                                {session.participants?.[0]?.name?.charAt(0).toUpperCase() || "?"}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {session.participants?.[0]?.name || "N/A"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-indigo-600">
                              {session.access_codes?.[0]?.code || "N/A"}
                            </span>
                            {session.access_codes?.[0]?.label && (
                              <span className="text-sm text-gray-500">
                                ({session.access_codes[0].label})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
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
                            <span className="text-sm font-semibold text-gray-900">
                              {session.score}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs rounded-full font-semibold ${
                              profile.color === "blue"
                                ? "bg-blue-100 text-blue-800"
                                : profile.color === "green"
                                ? "bg-green-100 text-green-800"
                                : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {profile.label}
                          </span>
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
                            : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
