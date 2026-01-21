"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    console.log('🔍 LOGIN - Début connexion');

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log('🔍 LOGIN - Réponse signIn:', { 
      hasUser: !!data?.user, 
      hasSession: !!data?.session,
      error: signInError?.message || 'NONE'
    });

    if (signInError) {
      console.log('🔍 LOGIN - ERREUR:', signInError.message);
      setError(signInError.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      console.log('🔍 LOGIN - ERREUR: pas de user dans la réponse');
      setError("Erreur lors de la connexion");
      setLoading(false);
      return;
    }

    console.log('🔍 LOGIN - Connexion réussie, user:', data.user.email);
    
    // Vérifier la session
    const { data: { session } } = await supabase.auth.getSession();
    console.log('🔍 LOGIN - Session après connexion:', session ? 'EXISTS' : 'NULL');
    
    if (!session) {
      console.log('🔍 LOGIN - ERREUR: Pas de session après connexion');
      setError("Erreur lors de la création de la session");
      setLoading(false);
      return;
    }
    
    // Forcer le rafraîchissement de la session pour s'assurer que les cookies sont synchronisés
    await supabase.auth.refreshSession();
    console.log('🔍 LOGIN - Session rafraîchie');
    
    // Attendre un peu pour que les cookies soient synchronisés
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Vérifier à nouveau
    const { data: { session: session2 } } = await supabase.auth.getSession();
    console.log('🔍 LOGIN - Session après attente:', session2 ? 'EXISTS' : 'NULL');
    
    // IMPORTANT: Utiliser router.push au lieu de window.location.href
    // Cela permet à Next.js de gérer la navigation et la synchronisation des cookies
    console.log('🔍 LOGIN - Redirection vers /admin/dashboard via router.push');
    
    // Forcer le rafraîchissement du router pour synchroniser les cookies
    router.push("/admin/dashboard");
    
    // Attendre un peu pour que la navigation commence
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Forcer le rafraîchissement de la page pour s'assurer que les cookies sont synchronisés
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-900">Connexion Admin</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white placeholder:text-gray-400"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-1">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white placeholder:text-gray-400"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-md font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
