"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";

export default function AccessPage() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Vérifier si le code est valide
      const { data: accessCode, error: codeError } = await supabase
        .from("access_codes")
        .select("*")
        .eq("code", code.toUpperCase())
        .single();

      if (codeError || !accessCode) {
        setError("Code d'accès invalide");
        setLoading(false);
        return;
      }

      // Vérifier si le code est actif
      if (!accessCode.is_active) {
        setError("Ce code d'accès n'est plus actif");
        setLoading(false);
        return;
      }

      // Vérifier expiration
      if (accessCode.expires_at && new Date(accessCode.expires_at) < new Date()) {
        setError("Ce code d'accès a expiré");
        setLoading(false);
        return;
      }

      // Vérifier limite d'utilisations
      if (accessCode.max_uses && accessCode.current_uses >= accessCode.max_uses) {
        setError("Ce code d'accès a atteint sa limite d'utilisations");
        setLoading(false);
        return;
      }

      // Créer le participant
      const { data: participant, error: participantError } = await supabase
        .from("participants")
        .insert({
          name: name.trim(),
          access_code_id: accessCode.id,
        })
        .select()
        .single();

      if (participantError || !participant) {
        setError("Erreur lors de la création du participant");
        setLoading(false);
        return;
      }

      // Rediriger vers le module
      router.push(`/module/1?participant=${participant.id}&code=${accessCode.id}`);
    } catch (err) {
      setError("Une erreur est survenue");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Accès au Module RSE
          </h1>
          <p className="text-gray-600">
            Entrez votre code d'accès et votre nom pour commencer
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
              Code d'accès
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              maxLength={20}
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Votre nom
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jean Dupont"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
            >
              {error}
            </motion.div>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Vérification..." : "Commencer le module"}
          </motion.button>
        </form>

        <div className="mt-6 text-center">
          <a
            href="/admin/login"
            className="text-sm text-indigo-600 hover:text-indigo-700"
          >
            Accès administrateur
          </a>
        </div>
      </motion.div>
    </div>
  );
}
