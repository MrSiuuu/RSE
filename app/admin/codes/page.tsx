"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { Database } from "@/types/database.types";
import { Code } from "lucide-react";
import Link from "next/link";

type AccessCode = Database["public"]["Tables"]["access_codes"]["Row"];

export default function AdminCodesPage() {
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [newCode, setNewCode] = useState({
    label: "",
    expiresAt: "",
    maxUses: "",
  });
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkUser();
    loadCodes();
  }, []);

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/admin/login");
    }
  };

  const loadCodes = async () => {
    const { data, error } = await supabase
      .from("access_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setCodes(data);
    }
    setLoading(false);
  };

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateCode = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Vous devez être connecté");
      return;
    }

    setCreating(true);
    setError("");
    setSuccess("");

    try {
      // Générer un code unique
      let code = generateCode();
      let exists = true;
      let attempts = 0;
      const maxAttempts = 10;

      while (exists && attempts < maxAttempts) {
        const { data } = await supabase
          .from("access_codes")
          .select("id")
          .eq("code", code)
          .single();

        if (!data) {
          exists = false;
        } else {
          code = generateCode();
          attempts++;
        }
      }

      if (attempts >= maxAttempts) {
        setError("Impossible de générer un code unique. Réessayez.");
        setCreating(false);
        return;
      }

      // Validation
      if (newCode.maxUses && (parseInt(newCode.maxUses) < 1 || isNaN(parseInt(newCode.maxUses)))) {
        setError("La limite d'utilisations doit être un nombre positif");
        setCreating(false);
        return;
      }

      const { error: insertError } = await supabase.from("access_codes").insert({
        code,
        label: newCode.label.trim() || null,
        is_active: true,
        expires_at: newCode.expiresAt || null,
        max_uses: newCode.maxUses ? parseInt(newCode.maxUses) : null,
        created_by: user.id,
      });

      if (insertError) {
        setError(insertError.message || "Erreur lors de la création du code");
        setCreating(false);
        return;
      }

      setSuccess(`Code ${code} créé avec succès !`);
      setShowCreateForm(false);
      setNewCode({ label: "", expiresAt: "", maxUses: "" });
      await loadCodes();
      
      // Effacer le message de succès après 3 secondes
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setCreating(false);
    }
  };

  const toggleCodeStatus = async (codeId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("access_codes")
      .update({ is_active: !currentStatus })
      .eq("id", codeId);

    if (!error) {
      loadCodes();
    } else {
      setError("Erreur lors de la modification du statut");
      setTimeout(() => setError(""), 3000);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setSuccess(`Code ${text} copié dans le presse-papiers !`);
      setTimeout(() => setSuccess(""), 2000);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retour
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des codes d'accès</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex justify-between items-center">
          <p className="text-gray-600">
            Créez et gérez les codes d'accès pour vos clients/prospects
          </p>
          <motion.button
            onClick={() => setShowCreateForm(!showCreateForm)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
          >
            {showCreateForm ? "Annuler" : "Créer un code"}
          </motion.button>
        </div>

        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow p-6 mb-6"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Créer un nouveau code</h2>
            
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                {success}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Label (optionnel) - Ex: "Client XYZ"
                </label>
                <input
                  type="text"
                  value={newCode.label}
                  onChange={(e) => {
                    setNewCode({ ...newCode, label: e.target.value });
                    setError("");
                  }}
                  placeholder="Client XYZ"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date d'expiration (optionnel)
                </label>
                <input
                  type="datetime-local"
                  value={newCode.expiresAt}
                  onChange={(e) => setNewCode({ ...newCode, expiresAt: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Laissez vide pour un code sans expiration
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Limite d'utilisations (optionnel)
                </label>
                <input
                  type="number"
                  value={newCode.maxUses}
                  onChange={(e) => setNewCode({ ...newCode, maxUses: e.target.value })}
                  placeholder="Ex: 10"
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Laissez vide pour un code illimité
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCreateCode}
                  disabled={creating}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? "Création..." : "Créer le code"}
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewCode({ label: "", expiresAt: "", maxUses: "" });
                    setError("");
                    setSuccess("");
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {success && !showCreateForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm"
          >
            {success}
          </motion.div>
        )}

        {error && !showCreateForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm"
          >
            {error}
          </motion.div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Label
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expiration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {codes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Code className="w-12 h-12 text-gray-300 mb-3" />
                      <p className="text-gray-500 text-lg mb-1">Aucun code d'accès créé</p>
                      <p className="text-gray-400 text-sm">
                        Cliquez sur "Créer un code" pour commencer
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                codes.map((code) => (
                <tr key={code.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-indigo-600">{code.code}</span>
                      <button
                        onClick={() => copyToClipboard(code.code)}
                        className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                        title="Copier le code"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    {code.label || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        code.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {code.is_active ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    {code.current_uses}
                    {code.max_uses && ` / ${code.max_uses}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    {code.expires_at ? (
                      <div>
                        <div className="text-sm">
                          {new Date(code.expires_at).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(code.expires_at).toLocaleTimeString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        {new Date(code.expires_at) < new Date() && (
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                            Expiré
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500">Illimité</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleCodeStatus(code.id, code.is_active)}
                      className={`px-3 py-1 text-sm rounded font-medium transition-colors ${
                        code.is_active
                          ? "bg-red-100 text-red-700 hover:bg-red-200"
                          : "bg-green-100 text-green-700 hover:bg-green-200"
                      }`}
                    >
                      {code.is_active ? "Désactiver" : "Activer"}
                    </button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
