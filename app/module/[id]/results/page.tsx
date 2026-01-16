"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

export default function ResultsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const score = parseInt(searchParams.get("score") || "0");
  const yesCount = parseInt(searchParams.get("yesCount") || "0");
  const supabase = createClient();

  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [whatsappLink, setWhatsappLink] = useState("");
  const [participantName, setParticipantName] = useState("");

  useEffect(() => {
    // Récupérer le lien WhatsApp depuis les settings
    fetchWhatsappLink();
    // Récupérer le nom du participant
    fetchParticipantName();
  }, [sessionId]);

  const fetchWhatsappLink = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "whatsapp_group_link")
        .single();

      if (error) {
        console.error("Erreur récupération WhatsApp link:", error);
        return;
      }

      if (data && data.value) {
        try {
          const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          setWhatsappLink(parsed);
        } catch (parseError) {
          // Si ce n'est pas du JSON, utiliser directement la valeur
          setWhatsappLink(data.value as string);
        }
      }
    } catch (err) {
      console.error("Erreur fetchWhatsappLink:", err);
    }
  };

  const fetchParticipantName = async () => {
    if (!sessionId) return;

    const { data: session } = await supabase
      .from("sessions")
      .select(`
        id,
        participants (
          name
        )
      `)
      .eq("id", sessionId)
      .single();

    if (session && (session as any).participants) {
      setParticipantName((session as any).participants.name);
    }
  };

  const handleSendWhatsapp = async () => {
    if (!whatsappMessage.trim() || !sessionId) return;

    try {
      // Récupérer le participant_id depuis la session
      const { data: sessionData } = await supabase
        .from("sessions")
        .select("participant_id")
        .eq("id", sessionId)
        .single();

      if (!sessionData) {
        console.error("Session non trouvée");
        return;
      }

      // Enregistrer le message dans la BDD
      const { error: insertError } = await supabase
        .from("whatsapp_messages")
        .insert({
          session_id: sessionId,
          participant_id: sessionData.participant_id,
          message: whatsappMessage,
          whatsapp_group_link: whatsappLink || null,
        });

      if (insertError) {
        console.error("Erreur sauvegarde message:", insertError);
        // Continuer quand même pour ouvrir WhatsApp
      }

      // Ouvrir WhatsApp avec le message pré-rempli
      const messageText = `Bonjour, je viens de terminer le Module 1 RSE.\n\nMon nom: ${participantName || "Participant"}\n\n${whatsappMessage}`;
      const message = encodeURIComponent(messageText);
      
      // Si on a un lien de groupe WhatsApp, l'utiliser, sinon ouvrir avec numéro par défaut
      const whatsappUrl = whatsappLink
        ? `${whatsappLink}${whatsappLink.includes("?") ? "&" : "?"}text=${message}`
        : `https://wa.me/?text=${message}`;

      window.open(whatsappUrl, "_blank");
    } catch (err) {
      console.error("Erreur envoi message:", err);
    }
  };

  // Déterminer le profil selon le score
  const getProfile = () => {
    if (yesCount <= 1) return { label: "Curieux", color: "blue" };
    if (yesCount <= 3) return { label: "Engagé débutant", color: "green" };
    return { label: "RSE sans le savoir", color: "purple" };
  };

  const profile = getProfile();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl"
      >
        <div className="text-center mb-8">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-gray-900 mb-4"
          >
            Félicitations !
          </motion.h1>
          <p className="text-gray-600 text-lg">
            Vous avez terminé le Module 1 – Niveau Découverte
          </p>
        </div>

        {/* Score animé */}
        <div className="mb-8">
          <div className="flex items-center justify-center mb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="relative w-32 h-32"
            >
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                  fill="none"
                />
                <motion.circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#4f46e5"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: score / 100 }}
                  transition={{ duration: 2, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="text-3xl font-bold text-indigo-600"
                >
                  {score}%
                </motion.span>
              </div>
            </motion.div>
          </div>

          <div className="text-center">
            <p className="text-gray-700 mb-2">
              Vous avez répondu <span className="font-bold">{yesCount}</span> fois "Oui" sur{" "}
              <span className="font-bold">5</span> questions
            </p>
            <div
              className={`inline-block px-4 py-2 rounded-full text-white font-semibold ${
                profile.color === "blue"
                  ? "bg-blue-600"
                  : profile.color === "green"
                  ? "bg-green-600"
                  : "bg-purple-600"
              }`}
            >
              Profil : {profile.label}
            </div>
          </div>
        </div>

        {/* CTA WhatsApp */}
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Partagez votre expérience
          </h2>
          <p className="text-gray-700 mb-4">
            Laissez un message à l'équipe pour partager votre retour sur ce module :
          </p>
          <textarea
            value={whatsappMessage}
            onChange={(e) => setWhatsappMessage(e.target.value)}
            placeholder="Votre message..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none mb-4 text-gray-900 bg-white resize-none"
            rows={4}
          />
          <motion.button
            onClick={handleSendWhatsapp}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={!whatsappMessage.trim()}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            Envoyer sur WhatsApp
          </motion.button>
        </div>

        <div className="text-center">
          <p className="text-gray-600">
            Merci d'avoir suivi ce module. Continuez votre démarche RSE !
          </p>
        </div>
      </motion.div>
    </div>
  );
}
