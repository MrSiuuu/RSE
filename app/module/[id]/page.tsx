"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import module1Data from "@/content/modules/module1.json";
import { createClient } from "@/lib/supabase/client";

type ModuleData = typeof module1Data;

export default function ModulePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const participantId = searchParams.get("participant");
  const codeId = searchParams.get("code");

  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentConceptIndex, setCurrentConceptIndex] = useState(0); // Pour naviguer entre les concepts
  const [currentStakeholderStep, setCurrentStakeholderStep] = useState(0); // Pour les étapes des parties prenantes
  const [moduleData, setModuleData] = useState<ModuleData | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [gestureSelections, setGestureSelections] = useState<Record<string, string>>({});
  const [firstAction, setFirstAction] = useState<Record<string, string>>({});
  const [stakeholderSelection, setStakeholderSelection] = useState<string[]>([]);
  const [testimonialInteractions, setTestimonialInteractions] = useState<Record<string, string>>({});
  const [startTime] = useState(Date.now());
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Créer la session une seule fois quand tout est prêt
  // Utiliser un ref pour éviter les appels multiples même si les dépendances changent
  const hasCreatedSession = useRef<string | null>(null); // Stocker la combinaison participantId+codeId au lieu d'un booléen

  // Définir createSession AVANT le useEffect qui l'utilise
  const createSession = async () => {
    // Protections contre les appels multiples
    if (!participantId || !codeId || !moduleData || sessionId || isCreatingSession) {
      return;
    }

    setIsCreatingSession(true);

    try {
      // Récupérer le module_id depuis la BDD
      const { data: module } = await supabase
        .from("modules")
        .select("id")
        .eq("number", parseInt(id))
        .single();

      if (!module) {
        setIsCreatingSession(false);
        return;
      }

      // Vérifier si une session existe déjà pour ce participant/code/module avec status "started" ou "completed"
      // Utiliser maybeSingle() au lieu de single() pour gérer le cas où aucune session n'existe
      const { data: existingSessions, error: checkError } = await supabase
        .from("sessions")
        .select("id, status")
        .eq("participant_id", participantId)
        .eq("access_code_id", codeId)
        .eq("module_id", module.id)
        .in("status", ["started", "completed"])
        .order("created_at", { ascending: false })
        .limit(1);

      // Si une session existe déjà, l'utiliser (pas d'erreur et on a des résultats)
      if (!checkError && existingSessions && existingSessions.length > 0) {
        setSessionId(existingSessions[0].id);
        setIsCreatingSession(false);
        return;
      }

      // Sinon, créer une nouvelle session
      const { data: session, error } = await supabase
        .from("sessions")
        .insert({
          participant_id: participantId,
          module_id: module.id,
          access_code_id: codeId,
          status: "started",
        })
        .select()
        .single();

      if (session && !error) {
        setSessionId(session.id);
      } else if (error) {
        console.error("Erreur création session:", error);
        // Réinitialiser le flag pour permettre une nouvelle tentative
        const sessionKey = participantId && codeId ? `${participantId}-${codeId}` : null;
        if (hasCreatedSession.current === sessionKey) {
          hasCreatedSession.current = null;
        }
      }
    } catch (err) {
      console.error("Erreur création session:", err);
      // Réinitialiser le flag pour permettre une nouvelle tentative
      const sessionKey = participantId && codeId ? `${participantId}-${codeId}` : null;
      if (hasCreatedSession.current === sessionKey) {
        hasCreatedSession.current = null;
      }
    } finally {
      setIsCreatingSession(false);
    }
  };

  // Charger le module une seule fois au montage (séparé pour éviter les cycles)
  useEffect(() => {
    if (id === "1" && !moduleData) {
      setModuleData(module1Data);
    }
  }, [id]); // Seulement dépendre de id, moduleData sera mis à jour une seule fois

  // Créer la session une seule fois quand tout est prêt
  useEffect(() => {
    // Générer une clé unique pour ce participant/code
    const sessionKey = participantId && codeId ? `${participantId}-${codeId}` : null;
    
    // Si on a déjà créé une session pour cette combinaison participant/code, ne pas recréer
    if (hasCreatedSession.current === sessionKey) {
      return;
    }
    
    // Ne créer la session que si :
    // 1. On a tous les paramètres nécessaires
    // 2. Le module est chargé (moduleData existe et n'est pas null)
    // 3. On n'a pas déjà de sessionId
    // 4. On n'est pas en train de créer une session
    if (participantId && codeId && moduleData && !sessionId && !isCreatingSession && sessionKey) {
      hasCreatedSession.current = sessionKey;
      createSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // createSession n'est pas dans les dépendances car toutes ses dépendances (participantId, codeId, moduleData, sessionId, isCreatingSession, id, supabase) sont soit dans les dépendances du useEffect, soit stables
  }, [participantId, codeId, moduleData, sessionId, isCreatingSession]); // Toutes les dépendances nécessaires (createSession utilise ces valeurs)

  const handleNext = () => {
    if (!moduleData) return;

    const currentSection = moduleData.sections[currentSectionIndex];

    // Gestion spéciale de la section concepts avec navigation par concept
    if (currentSection.type === "concepts" && currentSection.concepts) {
      const currentConcept = currentSection.concepts[currentConceptIndex];

      // Si c'est le concept "Parties prenantes", gérer les étapes séparées
      if (currentConcept?.term === "Parties prenantes") {
        // Écrans d'explication (0-4)
        if (currentStakeholderStep < 5) {
          setCurrentStakeholderStep(currentStakeholderStep + 1);
          return;
        }

        // Écran de sélection (step 5) - vérifier que 2 parties prenantes sont sélectionnées
        if (currentStakeholderStep === 5 && stakeholderSelection.length < 2) {
          return; // Ne pas avancer si moins de 2 sélectionnées
        }

        // Après la sélection, vérifier s'il y a des bénéfices à afficher
        if (currentStakeholderStep === 5 && stakeholderSelection.length === 2) {
          if (currentSection.benefits) {
            // Afficher les bénéfices
            setCurrentStakeholderStep(6);
            return;
          } else {
            // Pas de bénéfices, passer à la section suivante
            setCurrentConceptIndex(0);
            setCurrentStakeholderStep(0);
            if (currentSectionIndex < moduleData.sections.length - 1) {
              setCurrentSectionIndex(currentSectionIndex + 1);
            } else {
              handleComplete();
            }
            return;
          }
        }

        // Après les bénéfices, passer à la section suivante
        if (currentStakeholderStep === 6) {
          setCurrentConceptIndex(0);
          setCurrentStakeholderStep(0);
          if (currentSectionIndex < moduleData.sections.length - 1) {
            setCurrentSectionIndex(currentSectionIndex + 1);
          } else {
            handleComplete();
          }
          return;
        }
      }

      // Pour les autres concepts (RSE, ESG, ODD), naviguer simplement entre eux
      // Compter seulement les concepts qui ne sont pas "Parties prenantes"
      if (!currentSection.concepts) {
        if (currentSectionIndex < moduleData.sections.length - 1) {
          setCurrentSectionIndex(currentSectionIndex + 1);
        } else {
          handleComplete();
        }
        return;
      }
      
      const regularConcepts = currentSection.concepts.filter((c: any) => c.term !== "Parties prenantes");
      
      if (currentConceptIndex < regularConcepts.length - 1) {
        // Passer au concept suivant (RSE -> ESG -> ODD)
        setCurrentConceptIndex(currentConceptIndex + 1);
        return;
      } else {
        // Tous les concepts réguliers sont passés, passer aux parties prenantes
        // Trouver l'index du concept "Parties prenantes"
        const stakeholderIndex = currentSection.concepts.findIndex((c: any) => c.term === "Parties prenantes");
        if (stakeholderIndex !== -1) {
          setCurrentConceptIndex(stakeholderIndex);
          setCurrentStakeholderStep(0); // Commencer à l'étape 0 des parties prenantes
          return;
        }
        
        // Si pas de parties prenantes, vérifier les bénéfices ou passer à la section suivante
        if (currentSection.benefits) {
          // Afficher les bénéfices (si pas déjà affichés)
          setCurrentConceptIndex(regularConcepts.length); // Index pour afficher les bénéfices
          return;
        } else {
          // Pas de bénéfices, passer à la section suivante
          setCurrentConceptIndex(0);
          setCurrentStakeholderStep(0);
          if (currentSectionIndex < moduleData.sections.length - 1) {
            setCurrentSectionIndex(currentSectionIndex + 1);
          } else {
            handleComplete();
          }
          return;
        }
      }
    }

    // Si c'est le quiz, vérifier qu'une réponse est sélectionnée
    if (currentSection.type === "quiz") {
      const currentQuestion = currentSection.questions?.find(
        (q) => !quizAnswers[q.id]
      );
      if (currentQuestion) {
        return; // Ne pas avancer si pas de réponse
      }
    }

    // Si c'est la section gestures, vérifier que tous les gestes ont été sélectionnés
    if (currentSection.type === "gestures") {
      const allGesturesSelected = currentSection.gestures?.every(
        (gesture: any) => gestureSelections[gesture.id]
      );
      if (!allGesturesSelected) {
        return; // Ne pas avancer si pas tous les gestes sélectionnés
      }
    }

    // Si c'est la section testimonials, vérifier que tous les témoignages ont été interactés
    if (currentSection.type === "testimonials") {
      const allTestimonialsInteracted = currentSection.testimonials?.every(
        (testimonial: any) => testimonialInteractions[testimonial.id]
      );
      if (!allTestimonialsInteracted) {
        return; // Ne pas avancer si pas tous les témoignages interactés
      }
    }

    // Si c'est le formulaire première action, vérifier que tous les champs requis sont remplis
    if (currentSection.type === "form") {
      const requiredFields = currentSection.fields?.filter((f: any) => f.required) || [];
      const allFieldsFilled = requiredFields.every((field: any) => {
        const value = firstAction[field.id];
        return value && value.trim().length > 0;
      });
      
      if (!allFieldsFilled) {
        return; // Ne pas avancer si formulaire incomplet
      }
    }

    // Réinitialiser les index de sous-section
    setCurrentConceptIndex(0);
    setCurrentStakeholderStep(0);

    if (currentSectionIndex < moduleData.sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
    } else {
      // Fin du module, calculer le score et rediriger
      handleComplete();
    }
  };

  const handleQuizAnswer = (questionId: string, answer: string) => {
    setQuizAnswers({ ...quizAnswers, [questionId]: answer });
  };

  const canProceed = () => {
    if (!moduleData) return false;

    const currentSection = moduleData.sections[currentSectionIndex];

    // Pour les concepts, vérifier si on peut avancer
    if (currentSection.type === "concepts" && currentSection.concepts) {
      const currentConcept = currentSection.concepts[currentConceptIndex];
      
      // Si c'est "Parties prenantes" et qu'on est à l'étape de sélection, vérifier qu'on a sélectionné 2 parties prenantes
      if (currentConcept?.term === "Parties prenantes" && currentStakeholderStep === 5) {
        return stakeholderSelection.length === 2;
      }
      
      // Sinon, on peut toujours avancer dans les concepts
      return true;
    }

    // Si c'est le quiz, vérifier qu'une réponse est sélectionnée
    if (currentSection.type === "quiz") {
      return !currentSection.questions?.some((q: any) => !quizAnswers[q.id]);
    }

    // Si c'est le formulaire première action, vérifier que tous les champs requis sont remplis
    if (currentSection.type === "form") {
      const requiredFields = currentSection.fields?.filter((f: any) => f.required) || [];
      return requiredFields.every((field: any) => {
        const value = firstAction[field.id];
        return value && value.trim().length > 0;
      });
    }

    // Si c'est la section gestures, vérifier que tous les gestes ont été sélectionnés
    if (currentSection.type === "gestures") {
      return currentSection.gestures?.every(
        (gesture: any) => gestureSelections[gesture.id]
      ) ?? true;
    }

    // Si c'est la section testimonials, vérifier que tous les témoignages ont été interactés
    if (currentSection.type === "testimonials") {
      return currentSection.testimonials?.every(
        (testimonial: any) => testimonialInteractions[testimonial.id]
      ) ?? true;
    }

    return true;
  };

  const handleComplete = async () => {
    if (!sessionId || !moduleData) return;

    const quizSection = moduleData.sections.find((s) => s.type === "quiz");
    if (!quizSection || !quizSection.questions) return;

    // Compter les réponses "Oui"
    const yesCount = Object.values(quizAnswers).filter((a) => a === "yes").length;

    // Calculer le score (pourcentage de "Oui")
    const totalQuestions = quizSection.questions.length;
    const score = Math.round((yesCount / totalQuestions) * 100);

    try {
      // Préparer les données complètes à sauvegarder (quiz, gestes, première action, etc.)
      const responsesData = {
        quiz_answers: quizAnswers,
        gesture_selections: gestureSelections,
        first_action: firstAction,
        stakeholder_selection: stakeholderSelection,
        testimonial_interactions: testimonialInteractions,
      };

      // Mettre à jour la session avec toutes les données
      const { error: updateError } = await supabase
        .from("sessions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          duration_seconds: Math.floor((Date.now() - startTime) / 1000),
          score: score,
          total_questions: totalQuestions,
          correct_answers: yesCount,
          responses_data: responsesData, // Sauvegarder toutes les réponses en JSONB
        })
        .eq("id", sessionId);

      if (updateError) {
        console.error("Erreur sauvegarde session:", updateError);
        // Si le champ n'existe pas encore, on continue quand même
      }

      // Rediriger vers les résultats
      router.push(`/module/${id}/results?session=${sessionId}&score=${score}&yesCount=${yesCount}`);
    } catch (err) {
      console.error("Erreur completion:", err);
    }
  };

  if (!moduleData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Chargement...</div>
      </div>
    );
  }

  const currentSection = moduleData.sections[currentSectionIndex];
  const progress = ((currentSectionIndex + 1) / moduleData.sections.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Barre de progression moderne avec sticky */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <h1 className="text-sm sm:text-base font-bold text-gray-900 truncate">
              {moduleData.title}
            </h1>
            <span className="text-xs sm:text-sm font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
              Section {currentSectionIndex + 1} / {moduleData.sections.length}
            </span>
          </div>
          <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
            <motion.div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full shadow-lg"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <motion.div
                className="absolute inset-0 bg-white opacity-30"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Contenu avec padding mobile-first */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSectionIndex}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {renderSection(currentSection, {
              quizAnswers,
              onQuizAnswer: handleQuizAnswer,
              gestureSelections,
              setGestureSelections,
              firstAction,
              setFirstAction,
              stakeholderSelection,
              setStakeholderSelection,
              testimonialInteractions,
              setTestimonialInteractions,
              moduleData,
              currentConceptIndex,
              currentStakeholderStep,
              setCurrentConceptIndex,
              setCurrentStakeholderStep,
            })}
          </motion.div>
        </AnimatePresence>

        {/* Boutons navigation modernes */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-between">
          <motion.button
            onClick={() => setCurrentSectionIndex(Math.max(0, currentSectionIndex - 1))}
            disabled={currentSectionIndex === 0}
            whileHover={{ scale: currentSectionIndex === 0 ? 1 : 1.02, x: currentSectionIndex === 0 ? 0 : -2 }}
            whileTap={{ scale: 0.98 }}
            className={`flex-1 sm:flex-none px-6 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all shadow-lg ${
              currentSectionIndex === 0
                ? "bg-gray-200 text-gray-400 cursor-not-allowed opacity-50"
                : "bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-300 hover:border-indigo-400"
            }`}
          >
            ← Précédent
          </motion.button>

          <motion.button
            onClick={handleNext}
            whileHover={{ scale: canProceed() ? 1.02 : 1, x: canProceed() ? 2 : 0 }}
            whileTap={{ scale: 0.98 }}
            disabled={!canProceed()}
            className={`flex-1 sm:flex-none px-8 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all shadow-lg ${
              !canProceed()
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-xl hover:shadow-2xl"
            }`}
          >
            {(() => {
              const isLastSection = currentSectionIndex === moduleData.sections.length - 1;
              if (currentSection.type === "concepts") {
                const regularConcepts = currentSection.concepts?.filter((c: any) => c.term !== "Parties prenantes") || [];
                const hasMoreConcepts = currentConceptIndex < regularConcepts.length;
                const isStakeholderSection = currentSection.concepts?.[currentConceptIndex]?.term === "Parties prenantes";
                const hasMoreStakeholderSteps = isStakeholderSection && currentStakeholderStep < 6;
                if (hasMoreConcepts || hasMoreStakeholderSteps || (currentSection.benefits && currentConceptIndex === regularConcepts.length)) {
                  return "Suivant →";
                }
              }
              if (isLastSection) {
                return "Terminer le module";
              }
              return "Suivant →";
            })()}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function renderSection(
  section: any,
  handlers: {
    quizAnswers: Record<string, string>;
    onQuizAnswer: (qId: string, answer: string) => void;
    gestureSelections: Record<string, string>;
    setGestureSelections: (s: Record<string, string>) => void;
    firstAction: Record<string, string>;
    setFirstAction: (a: Record<string, string>) => void;
    stakeholderSelection: string[];
    setStakeholderSelection: (s: string[]) => void;
    testimonialInteractions: Record<string, string>;
    setTestimonialInteractions: (t: Record<string, string>) => void;
    moduleData: ModuleData | null;
    currentConceptIndex: number;
    currentStakeholderStep: number;
    setCurrentConceptIndex: (i: number) => void;
    setCurrentStakeholderStep: (s: number) => void;
  }
) {
  switch (section.type) {
    case "welcome":
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-gradient-to-br from-white via-indigo-50 to-purple-50 rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 border-2 border-indigo-100"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {section.title}
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-700 leading-relaxed max-w-2xl mx-auto">
              {section.content.mainMessage}
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-indigo-200 shadow-lg">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
              Objectifs du module
            </h3>
            <ul className="space-y-3 sm:space-y-4">
              {section.content.objectives.map((obj: string, i: number) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-3 text-sm sm:text-base text-gray-700"
                >
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.5, delay: i * 0.1, repeat: Infinity, repeatDelay: 2 }}
                    className="text-indigo-500 text-xl font-bold flex-shrink-0 mt-0.5"
                  >
                    •
                  </motion.span>
                  <span className="flex-1">{obj}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.div>
      );

    case "info":
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-gradient-to-br from-white to-blue-50 rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 border-2 border-blue-100"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-6 sm:mb-8 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {section.title}
          </h2>
          <div className="space-y-4 sm:space-y-5 mb-6 sm:mb-8">
            {section.content.points.map((point: string, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15 }}
                className="bg-white/80 backdrop-blur-sm rounded-xl p-4 sm:p-5 shadow-md border-l-4 border-indigo-500 hover:shadow-lg transition-shadow"
              >
                <p className="text-sm sm:text-base md:text-lg text-gray-700 leading-relaxed flex items-start gap-3">
                  <span className="flex-1">{point}</span>
                </p>
              </motion.div>
            ))}
          </div>
          {section.content.message && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: section.content.points.length * 0.15 }}
              className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5 sm:p-6 border-2 border-indigo-200 shadow-lg"
            >
              <p className="text-sm sm:text-base md:text-lg text-gray-700 italic leading-relaxed text-center">
                {section.content.message}
              </p>
            </motion.div>
          )}
        </motion.div>
      );

    case "quiz":
      const currentQuestionIndex = Object.keys(handlers.quizAnswers).length;
      const currentQuestion = section.questions?.[currentQuestionIndex];

      if (!currentQuestion) {
        // Toutes les questions sont répondues, afficher le résultat
        const yesCount = Object.values(handlers.quizAnswers).filter((a) => a === "yes").length;
        
        // Parser le résultat selon le nombre de "Oui"
        // Format attendu : "0–1 Oui", "2–3 Oui", "4–5 Oui"
        const result = section.results.find((r: any) => {
          const rangeStr = r.range.trim();
          // Extraire les nombres (format: "0–1" ou "2-3" ou "4–5")
          const match = rangeStr.match(/(\d+)[–-](\d+)/) || rangeStr.match(/(\d+)/);
          if (!match) return false;
          
          const min = parseInt(match[1]);
          const max = match[2] ? parseInt(match[2]) : min;
          return yesCount >= min && yesCount <= max;
        }) || section.results[0];

        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="w-full max-w-4xl mx-auto px-4 sm:px-6"
          >
            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 border-2 border-indigo-100">
              <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Résultat du quiz
                </h2>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-indigo-100 to-purple-100 border-2 border-indigo-300 rounded-2xl p-6 sm:p-8 mb-6 shadow-xl"
              >
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-indigo-900 mb-3 sm:mb-4">
                  {result.label}
                </h3>
                <p className="text-base sm:text-lg md:text-xl text-indigo-800 leading-relaxed font-medium">
                  {result.message}
                </p>
              </motion.div>
              {section.contextualization && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white/80 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-indigo-200 shadow-md"
                >
                  <p className="text-sm sm:text-base text-gray-700 italic text-center leading-relaxed">
                    {section.contextualization}
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        );
      }

      const totalQuestions = section.questions?.length || 0;
      const answeredQuestions = Object.keys(handlers.quizAnswers).length;

      return (
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
          {/* Carte principale avec gradient */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 border border-indigo-100"
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{section.title}</h2>
                <p className="text-sm sm:text-base text-gray-600 mt-1">{section.intro}</p>
              </div>
            </div>

            {/* Barre de progression moderne */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm sm:text-base font-semibold text-gray-700 bg-white px-3 py-1 rounded-full shadow-sm">
                  Question {currentQuestion.order} / {totalQuestions}
                </span>
                <span className="text-sm sm:text-base font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                  {answeredQuestions}/{totalQuestions} répondues
                </span>
              </div>
              <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                <motion.div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full shadow-lg"
                  initial={{ width: 0 }}
                  animate={{ width: `${(answeredQuestions / totalQuestions) * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <motion.div
                    className="absolute inset-0 bg-white opacity-30"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  />
                </motion.div>
              </div>
            </div>

            {/* Question avec style moderne */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg border-l-4 border-indigo-500">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 leading-relaxed">
                  {currentQuestion.text}
                </h3>
              </div>
            </motion.div>

            {/* Options avec cartes colorées */}
            <div className="space-y-3 sm:space-y-4 mb-6">
              {currentQuestion.options.map((option: any, index: number) => {
                const isSelected = handlers.quizAnswers[currentQuestion.id] === option.value;
                const isYes = option.value === "yes";
                
                return (
                  <motion.button
                    key={option.value}
                    onClick={() => handlers.onQuizAnswer(currentQuestion.id, option.value)}
                    initial={{ opacity: 0, x: -30 }}
                    animate={
                      isSelected
                        ? isYes
                          ? { 
                              opacity: 1,
                              x: 0,
                              scale: [1, 1.05, 1],
                              boxShadow: [
                                "0 4px 6px rgba(0,0,0,0.1)",
                                "0 10px 25px rgba(34, 197, 94, 0.4)",
                                "0 4px 6px rgba(0,0,0,0.1)"
                              ]
                            }
                          : { 
                              opacity: 1,
                              x: [0, -8, 8, -8, 8, 0],
                              boxShadow: [
                                "0 4px 6px rgba(0,0,0,0.1)",
                                "0 10px 25px rgba(249, 115, 22, 0.4)",
                                "0 4px 6px rgba(0,0,0,0.1)"
                              ]
                            }
                        : { opacity: 1, x: 0 }
                    }
                    transition={{ delay: isSelected ? 0 : 0.3 + index * 0.1, duration: 0.3 }}
                    whileHover={!isSelected ? { scale: 1.02, y: -2 } : {}}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full text-left rounded-2xl p-5 sm:p-6 border-2 transition-all duration-300 relative overflow-hidden group ${
                      isSelected
                        ? isYes
                          ? "border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-xl"
                          : "border-orange-500 bg-gradient-to-br from-orange-50 to-amber-50 shadow-xl"
                        : "border-gray-200 bg-white hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-lg"
                    }`}
                  >
                    {/* Effet de brillance au survol */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-500 transform -translate-x-full group-hover:translate-x-full" />
                    
                    <div className="relative flex items-center gap-4">
                      {/* Icône de sélection */}
                      <motion.div
                        className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xl font-bold transition-all ${
                          isSelected
                            ? isYes
                              ? "bg-green-500 text-white shadow-lg"
                              : "bg-orange-500 text-white shadow-lg"
                            : "bg-gray-200 text-gray-400 group-hover:bg-indigo-200 group-hover:text-indigo-600"
                        }`}
                        animate={isSelected ? { rotate: 360 } : {}}
                        transition={{ duration: 0.5 }}
                      >
                        {isSelected ? (isYes ? "✓" : "✗") : String.fromCharCode(65 + index)}
                      </motion.div>
                      
                      {/* Label avec style */}
                      <span className={`flex-1 text-base sm:text-lg font-semibold transition-colors ${
                        isSelected
                          ? isYes
                            ? "text-green-800"
                            : "text-orange-800"
                          : "text-gray-700 group-hover:text-indigo-700"
                      }`}>
                        {option.label}
                      </span>
                      
                      {/* Badge de sélection */}
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          className={`px-3 py-1 rounded-full text-xs sm:text-sm font-bold ${
                            isYes
                              ? "bg-green-500 text-white"
                              : "bg-orange-500 text-white"
                          }`}
                        >
                          {isYes ? "Excellent !" : "À améliorer"}
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Feedback avec animation */}
            {handlers.quizAnswers[currentQuestion.id] && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, type: "spring" }}
                className={`rounded-2xl p-5 sm:p-6 border-2 shadow-lg ${
                  handlers.quizAnswers[currentQuestion.id] === "yes"
                    ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-300"
                    : "bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    {handlers.quizAnswers[currentQuestion.id] === "yes" && currentQuestion.feedback?.yes && (
                      <p className="text-base sm:text-lg font-medium text-green-800 leading-relaxed">
                        {currentQuestion.feedback.yes}
                      </p>
                    )}
                    {handlers.quizAnswers[currentQuestion.id] === "no" && currentQuestion.feedback?.no && (
                      <p className="text-base sm:text-lg font-medium text-blue-800 leading-relaxed">
                        {currentQuestion.feedback.no}
                      </p>
                    )}
                    {!currentQuestion.feedback?.yes && !currentQuestion.feedback?.no && handlers.quizAnswers[currentQuestion.id] === "yes" && (
                      <p className="text-base sm:text-lg font-medium text-green-800 leading-relaxed">
                        Excellente nouvelle ! Continuez dans cette voie.
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      );

    case "concepts":
      // Vérifier que les concepts existent
      if (!section.concepts || section.concepts.length === 0) {
        return (
          <div className="w-full mx-auto px-3 sm:px-4 md:px-6 max-w-4xl">
            <div className="bg-white rounded-[30px] sm:rounded-[40px] p-6 sm:p-8 shadow-xl border-2 border-gray-200 text-center">
              <p className="text-gray-600">Aucun concept disponible</p>
            </div>
          </div>
        );
      }

      // Filtrer les concepts réguliers (RSE, ESG, ODD) pour le compteur
      const regularConcepts = section.concepts.filter((c: any) => c.term !== "Parties prenantes");
      const currentConcept = section.concepts[handlers.currentConceptIndex];

      // Si c'est "Parties prenantes", gérer les étapes spécifiques
      if (currentConcept?.term === "Parties prenantes") {
        const stakeholderSteps = [
          {
            title: "Qu'est-ce qu'une partie prenante ?",
            explanation: "Les parties prenantes sont toutes les personnes ou organisations qui influencent votre entreprise ou qui sont influencées par elle.",
            icon: ""
          },
          {
            title: "Employés",
            explanation: "Vos collaborateurs sont au cœur de votre entreprise. Leur bien-être et leur développement sont essentiels pour une démarche RSE réussie.",
            icon: "",
            examples: ["Formation continue", "Sécurité au travail", "Équilibre vie pro/perso"]
          },
          {
            title: "Clients",
            explanation: "Vos clients sont la raison d'être de votre entreprise. Leur satisfaction et leur fidélité sont cruciales. Une démarche RSE renforce la confiance.",
            icon: "",
            examples: ["Qualité des produits/services", "Transparence", "Service après-vente"]
          },
          {
            title: "Fournisseurs",
            explanation: "Travailler avec des fournisseurs responsables garantit une chaîne de valeur éthique et durable, réduisant les risques et améliorant votre image.",
            icon: "",
            examples: ["Achats responsables", "Relations équitables", "Critères sociaux/environnementaux"]
          },
          {
            title: "Communauté locale",
            explanation: "L'intégration de votre entreprise dans son environnement local est un facteur clé de succès. Contribuer positivement renforce votre légitimité.",
            icon: "",
            examples: ["Emploi local", "Soutien aux associations", "Réduction des nuisances"]
          },
          {
            title: "Sélectionnez vos parties prenantes",
            explanation: "Sélectionnez maintenant les 2 parties prenantes les plus importantes pour votre entreprise aujourd'hui.",
            icon: ""
          }
        ];

        // Vérifier si on doit afficher les bénéfices (step 6)
        if (handlers.currentStakeholderStep === 6 && section.benefits) {
          return (
            <div className="w-full mx-auto px-3 sm:px-4 md:px-6 max-w-4xl">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, type: "spring" }}
                className="relative bg-gradient-to-br from-green-100 via-emerald-100 to-teal-100 rounded-[30px] sm:rounded-[40px] p-4 sm:p-6 md:p-8 shadow-2xl border-4 border-green-300 overflow-hidden"
              >
                <motion.div
                  className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 bg-green-400/30 rounded-full blur-3xl"
                  animate={{ scale: [1, 1.3, 1], rotate: [0, 90, 180] }}
                  transition={{ duration: 5, repeat: Infinity }}
                />

                <div className="relative z-10">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
                    className="text-5xl sm:text-6xl md:text-7xl mb-4 sm:mb-6 text-center"
                  >
                  </motion.div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 mb-4 sm:mb-6 md:mb-8 text-center">
                    {section.benefits.title}
                  </h3>
                  <div className="space-y-3 sm:space-y-4 md:space-y-6">
                    {section.benefits.points.map((point: any, i: number) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.2, type: "spring" }}
                        className="bg-white/90 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-xl border-2 border-green-200 flex items-start gap-3 sm:gap-4"
                      >
                        <div>
                          <p className="font-black text-gray-900 mb-2 text-sm sm:text-base md:text-lg">{point.title}</p>
                          <p className="text-xs sm:text-sm md:text-base text-gray-700 leading-relaxed">{point.detail}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          );
        }

        // Vérifier que currentStakeholderStep est valide avant d'accéder à stakeholderSteps
        if (handlers.currentStakeholderStep < 0 || handlers.currentStakeholderStep >= stakeholderSteps.length) {
          // Réinitialiser à 0 si l'index est invalide
          handlers.setCurrentStakeholderStep(0);
          return (
            <div className="w-full mx-auto px-3 sm:px-4 md:px-6 max-w-4xl">
              <div className="bg-white rounded-[30px] sm:rounded-[40px] p-6 sm:p-8 shadow-xl border-2 border-gray-200 text-center">
                <p className="text-gray-600">Réinitialisation de l'étape...</p>
              </div>
            </div>
          );
        }

        const currentStep = stakeholderSteps[handlers.currentStakeholderStep];

        // Vérification de sécurité supplémentaire
        if (!currentStep || !currentStep.icon || !currentStep.title || !currentStep.explanation) {
          // Réinitialiser à 0 si le step est invalide
          handlers.setCurrentStakeholderStep(0);
          return (
            <div className="w-full mx-auto px-3 sm:px-4 md:px-6 max-w-4xl">
              <div className="bg-white rounded-[30px] sm:rounded-[40px] p-6 sm:p-8 shadow-xl border-2 border-gray-200 text-center">
                <p className="text-gray-600">Erreur de chargement de l'étape. Réinitialisation...</p>
              </div>
            </div>
          );
        }

        // Écran de sélection (step 5)
        if (handlers.currentStakeholderStep === 5) {
          return (
            <div className="w-full mx-auto px-3 sm:px-4 md:px-6 max-w-4xl">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, type: "spring" }}
                className="relative bg-white rounded-[30px] sm:rounded-[40px] p-4 sm:p-6 md:p-8 shadow-2xl border-2 border-indigo-200 overflow-hidden"
              >
                <div className="mb-6 sm:mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xs sm:text-sm font-bold px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
                      Étape {handlers.currentStakeholderStep + 1} / {stakeholderSteps.length}
                    </div>
                  </div>
                  <h2 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 mb-3 leading-tight">
                    {currentStep.title}
                  </h2>
                  <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
                    {currentStep.explanation}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
                  {["Employés", "Clients", "Fournisseurs", "Communauté locale"].map((stakeholder, idx) => {
                    const isSelected = handlers.stakeholderSelection.includes(stakeholder);
                    const canSelect = handlers.stakeholderSelection.length < 2;
                    const icons: Record<string, string> = {
                      "Employés": "",
                      "Clients": "",
                      "Fournisseurs": "",
                      "Communauté locale": ""
                    };

                    return (
                      <motion.button
                        key={stakeholder}
                        onClick={() => {
                          if (isSelected) {
                            handlers.setStakeholderSelection(
                              handlers.stakeholderSelection.filter((s) => s !== stakeholder)
                            );
                          } else if (canSelect) {
                            handlers.setStakeholderSelection([...handlers.stakeholderSelection, stakeholder]);
                          }
                        }}
                        initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
                        animate={{
                          opacity: 1,
                          scale: isSelected ? 1.05 : 1,
                          rotate: isSelected ? 2 : 0,
                        }}
                        transition={{ delay: idx * 0.15, type: "spring", stiffness: 200 }}
                        whileHover={canSelect || isSelected ? { scale: 1.05, y: -3 } : { scale: 0.98 }}
                        whileTap={canSelect || isSelected ? { scale: 0.95 } : {}}
                        disabled={!canSelect && !isSelected}
                        className={`relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-5 border-2 transition-all font-bold text-sm sm:text-base shadow-xl ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-400 shadow-indigo-500/50 z-10"
                            : canSelect
                            ? "bg-white text-gray-800 border-indigo-300 hover:border-indigo-500"
                            : "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed opacity-50"
                        }`}
                      >
                        <div className="relative flex flex-col items-center gap-2">
                          <span className="text-lg sm:text-xl font-bold">{stakeholder}</span>
                          {isSelected && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute -top-2 -right-2 bg-yellow-400 text-indigo-900 rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-sm sm:text-base font-black shadow-lg"
                            >
                              ✓
                            </motion.span>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {handlers.stakeholderSelection.length > 0 && handlers.stakeholderSelection.length < 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-4 text-center"
                  >
                    <p className="text-sm sm:text-base font-semibold text-blue-900">
                      {handlers.stakeholderSelection.length === 1
                        ? `1 sélectionnée. Choisissez-en une autre.`
                        : "Sélectionnez 2 parties prenantes"}
                    </p>
                  </motion.div>
                )}

                {handlers.stakeholderSelection.length === 2 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl p-5 sm:p-6 text-center shadow-xl"
                  >
                    <p className="text-base sm:text-lg font-black text-white mb-2">
                      Sélection terminée !
                    </p>
                    <p className="text-sm sm:text-base text-green-50 font-medium">
                      {handlers.stakeholderSelection.join(" et ")}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            </div>
          );
        }

        // Écrans d'explication pour chaque stakeholder (steps 0-4)
        return (
          <div className="w-full mx-auto px-3 sm:px-4 md:px-6 max-w-4xl">
            <motion.div
              key={handlers.currentStakeholderStep}
              initial={{ opacity: 0, x: handlers.currentStakeholderStep % 2 === 0 ? -50 : 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: handlers.currentStakeholderStep % 2 === 0 ? 50 : -50 }}
              transition={{ duration: 0.5, type: "spring" }}
              className="relative bg-white rounded-[30px] sm:rounded-[40px] p-4 sm:p-6 md:p-8 shadow-2xl border-2 border-indigo-200 overflow-hidden"
            >
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4 sm:mb-6 gap-3">
                  <div className="flex-1">
                    <h2 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 mb-3 sm:mb-4 leading-tight">
                      {currentStep.title}
                    </h2>
                  </div>
                  <div className="text-xs sm:text-sm font-bold px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full whitespace-nowrap">
                    {handlers.currentStakeholderStep + 1} / {stakeholderSteps.length}
                  </div>
                </div>

                <p className="text-base sm:text-lg md:text-xl text-gray-700 leading-relaxed mb-4 sm:mb-6">
                  {currentStep.explanation}
                </p>

                {currentStep.examples && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, type: "spring" }}
                    className="bg-gray-50 rounded-xl sm:rounded-2xl p-4 sm:p-5 border-2 border-gray-200 shadow-inner"
                  >
                    <h4 className="text-sm sm:text-base font-bold text-gray-800 mb-3">
                      Exemples concrets :
                    </h4>
                    <div className="space-y-2 sm:space-y-3">
                      {currentStep.examples.map((example: string, i: number) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 + 0.4 }}
                          className="flex items-start gap-2"
                        >
                          <span className="text-indigo-400 text-lg flex-shrink-0">•</span>
                          <p className="text-sm sm:text-base md:text-lg text-gray-800 font-medium flex-1">
                            {example}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        );
      }

      // Affichage normal des autres concepts (RSE, ESG, ODD) - un concept par écran
      if (handlers.currentConceptIndex < regularConcepts.length) {
        const concept = regularConcepts[handlers.currentConceptIndex];
        const conceptIcons: Record<string, string> = {
          "RSE": "",
          "ESG": "",
          "ODD": ""
        };

        return (
          <div className="w-full mx-auto px-3 sm:px-4 md:px-6 max-w-4xl">
            <motion.div
              key={handlers.currentConceptIndex}
              initial={{ opacity: 0, x: handlers.currentConceptIndex % 2 === 0 ? -50 : 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: handlers.currentConceptIndex % 2 === 0 ? 50 : -50 }}
              transition={{ duration: 0.4, type: "spring" }}
              className="relative bg-white rounded-[30px] sm:rounded-[40px] p-4 sm:p-6 md:p-8 shadow-2xl border-2 border-gray-200 overflow-hidden min-h-[calc(100vh-300px)] sm:min-h-auto flex flex-col"
            >
              <div className="relative z-10 flex-1 flex flex-col">
                {/* Header avec progression */}
                <div className="flex items-start justify-between mb-4 sm:mb-6 gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1">
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] xs:text-xs sm:text-sm font-bold px-2 sm:px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 inline-block whitespace-nowrap">
                        Concept {handlers.currentConceptIndex + 1} / {regularConcepts.length}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Titre du concept */}
                <motion.h2
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 mb-4 sm:mb-6 md:mb-8 leading-tight break-words"
                >
                  {concept.term}
                </motion.h2>

                {/* Définition */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mb-4 sm:mb-6 md:mb-8 flex-1"
                >
                  <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-800 leading-relaxed font-medium">
                    {concept.definition}
                  </p>
                </motion.div>

                {/* Exemple */}
                {concept.example && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
                    className="relative mb-4 sm:mb-6 md:mb-8 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl overflow-hidden bg-blue-50 border-2 border-blue-200"
                  >
                    <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-900 font-semibold leading-relaxed">
                      <span className="font-black block sm:inline mb-1 sm:mb-0">Exemple :</span> <span className="block sm:inline">{concept.example}</span>
                    </p>
                  </motion.div>
                )}

                {/* Exemples multiples (pour ODD) */}
                {concept.examples && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="space-y-2 sm:space-y-3 md:space-y-4 mb-4 sm:mb-6"
                  >
                    {concept.examples.map((ex: string, j: number) => (
                      <motion.div
                        key={j}
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + j * 0.1, type: "spring", stiffness: 150 }}
                        className="flex items-start gap-2 sm:gap-3 md:gap-4 p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl bg-gray-50 border-2 border-gray-200 shadow-md"
                      >
                        <motion.div
                          className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-2"
                        />
                        <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-800 font-medium flex-1 leading-relaxed pt-0.5">
                          {ex}
                        </p>
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {/* Explication complémentaire */}
                {concept.explanation && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="p-3 sm:p-4 md:p-5 lg:p-6 rounded-xl sm:rounded-2xl bg-gray-50 border-2 border-gray-200 mt-auto"
                  >
                    <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-700 leading-relaxed italic">
                      {concept.explanation}
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        );
      }

      // Affichage des bénéfices après tous les concepts
      if (section.benefits && handlers.currentConceptIndex >= regularConcepts.length) {
        return (
          <div className="w-full mx-auto px-3 sm:px-4 md:px-6 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, type: "spring" }}
              className="relative bg-gradient-to-br from-green-100 via-emerald-100 to-teal-100 rounded-[30px] sm:rounded-[40px] p-4 sm:p-6 md:p-8 shadow-2xl border-4 border-green-300 overflow-hidden"
            >
              <motion.div
                className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 bg-green-400/30 rounded-full blur-3xl"
                animate={{ scale: [1, 1.3, 1], rotate: [0, 90, 180] }}
                transition={{ duration: 5, repeat: Infinity }}
              />

              <div className="relative z-10">
                <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 mb-4 sm:mb-6 md:mb-8 text-center">
                  {section.benefits.title}
                </h3>
                <div className="space-y-3 sm:space-y-4 md:space-y-6">
                  {section.benefits.points.map((point: any, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.2, type: "spring" }}
                      className="bg-white/90 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-xl border-2 border-green-200 flex items-start gap-3 sm:gap-4"
                    >
                      <div>
                        <p className="font-black text-gray-900 mb-2 text-sm sm:text-base md:text-lg">{point.title}</p>
                        <p className="text-xs sm:text-sm md:text-base text-gray-700 leading-relaxed">{point.detail}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        );
      }

      return null;

    case "gestures":
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-gradient-to-br from-white via-green-50 to-emerald-50 rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 border-2 border-green-100"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              {section.title}
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              {section.intro}
            </p>
          </div>
          <div className="space-y-4 sm:space-y-5">
            {section.gestures.map((gesture: any, index: number) => (
              <motion.div
                key={gesture.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15 }}
                className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 sm:p-6 shadow-lg border-2 border-green-200 hover:border-green-400 hover:shadow-xl transition-all"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{gesture.title}</h3>
                    <p className="text-sm sm:text-base text-gray-600 mb-3">
                      <span className="font-semibold text-green-700">Impact :</span> {gesture.impact}
                    </p>
                      {gesture.tip && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
                          <p className="text-xs sm:text-sm text-amber-800 font-medium">
                            Astuce : {gesture.tip}
                          </p>
                        </div>
                      )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-3 mt-4">
                  {section.options.map((option: string, optIndex: number) => {
                    const isSelected = handlers.gestureSelections[gesture.id] === option;
                    return (
                      <motion.button
                        key={option}
                        onClick={() =>
                          handlers.setGestureSelections({
                            ...handlers.gestureSelections,
                            [gesture.id]: option,
                          })
                        }
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: optIndex * 0.1 }}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        className={`px-4 sm:px-5 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md ${
                          isSelected
                            ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg scale-105"
                            : "bg-white text-gray-700 border-2 border-gray-300 hover:border-green-400 hover:bg-green-50"
                        }`}
                      >
                        {option}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      );

    case "testimonials":
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-gradient-to-br from-white via-purple-50 to-pink-50 rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 border-2 border-purple-100"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {section.title}
            </h2>
          </div>
          <div className="space-y-5 sm:space-y-6">
            {section.testimonials.map((testimonial: any, index: number) => {
              const interaction = handlers.testimonialInteractions[testimonial.id];
              return (
                <motion.div
                  key={testimonial.id}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.15 }}
                  className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 sm:p-6 shadow-lg border-2 border-purple-200 hover:border-purple-400 hover:shadow-xl transition-all"
                >
                  <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-5">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl md:text-2xl font-black text-gray-900 mb-3 sm:mb-4 leading-tight">
                        {testimonial.title}
                      </h3>
                      {testimonial.content && (
                        <motion.p
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.15 + 0.2 }}
                          className="text-sm sm:text-base md:text-lg text-gray-700 leading-relaxed mb-3 sm:mb-4 italic font-medium"
                        >
                          "{testimonial.content}"
                        </motion.p>
                      )}
                      {testimonial.author && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.15 + 0.3 }}
                          className="text-xs sm:text-sm md:text-base font-semibold text-purple-700"
                        >
                          — {testimonial.author}
                        </motion.p>
                      )}
                    </div>
                  </div>
                  
                  {section.interactionOptions && (
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      {section.interactionOptions.map((option: string, optIndex: number) => {
                        const isSelected = interaction === option;
                        return (
                          <motion.button
                            key={option}
                            onClick={() =>
                              handlers.setTestimonialInteractions({
                                ...handlers.testimonialInteractions,
                                [testimonial.id]: isSelected ? "" : option,
                              })
                            }
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: optIndex * 0.1 }}
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            className={`px-4 sm:px-5 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md ${
                              isSelected
                                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105"
                                : "bg-white text-gray-700 border-2 border-gray-300 hover:border-purple-400 hover:bg-purple-50"
                            }`}
                          >
                            {option}
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      );

    case "form":
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-gradient-to-br from-white via-purple-50 to-pink-50 rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 border-2 border-purple-100"
        >
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {section.title}
            </h2>
          </div>
          <div className="space-y-5 sm:space-y-6">
            {section.fields.map((field: any, index: number) => (
              <motion.div
                key={field.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/80 backdrop-blur-sm rounded-xl p-4 sm:p-5 shadow-lg border border-purple-200"
              >
                <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
                  {field.label}
                  {field.required && <span className="text-red-500">*</span>}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    value={handlers.firstAction[field.id] || ""}
                    onChange={(e) =>
                      handlers.setFirstAction({
                        ...handlers.firstAction,
                        [field.id]: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-gray-900 bg-white resize-none transition-all shadow-sm hover:shadow-md placeholder:text-gray-400"
                    rows={5}
                    placeholder={field.placeholder || "Tapez votre réponse ici..."}
                  />
                ) : (
                  <input
                    type={field.type}
                    value={handlers.firstAction[field.id] || ""}
                    onChange={(e) =>
                      handlers.setFirstAction({
                        ...handlers.firstAction,
                        [field.id]: e.target.value,
                      })
                    }
                    placeholder={field.placeholder || "Tapez votre réponse ici..."}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-gray-900 bg-white transition-all shadow-sm hover:shadow-md placeholder:text-gray-400"
                  />
                )}
              </motion.div>
            ))}
          </div>
          {section.message && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: section.fields.length * 0.1 }}
              className="mt-6 sm:mt-8 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 sm:p-5 border-2 border-purple-200 shadow-md"
            >
              <p className="text-sm sm:text-base text-gray-700 italic text-center leading-relaxed">
                {section.message}
              </p>
            </motion.div>
          )}
        </motion.div>
      );

    case "summary":
      // Calculer le profil RSE depuis les réponses du quiz
      const yesCount = Object.values(handlers.quizAnswers).filter((a) => a === "yes").length;
      const profileRSE =
        yesCount <= 1
          ? { label: "Curieux", message: "Vous découvrez la RSE. Ce module est fait pour vous.", color: "blue" }
          : yesCount <= 3
          ? { label: "Engagé débutant", message: "Vous avez déjà des pratiques responsables. Il est temps de les structurer.", color: "green" }
          : { label: "RSE sans le savoir", message: "Votre entreprise agit déjà de manière responsable. Il faut maintenant valoriser ces actions.", color: "purple" };

      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
          className="bg-gradient-to-br from-white via-yellow-50 to-orange-50 rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 border-2 border-yellow-100"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent">
              {section.title}
            </h2>
          </div>
          
          {/* Profil RSE avec design moderne */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`mb-6 sm:mb-8 rounded-2xl p-6 sm:p-8 border-2 shadow-xl ${
              profileRSE.color === "blue"
                ? "bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-300"
                : profileRSE.color === "green"
                ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-300"
                : "bg-gradient-to-br from-purple-50 to-pink-50 border-purple-300"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Votre profil RSE :</h3>
            </div>
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: "spring" }}
              className={`inline-block px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-lg sm:text-xl font-bold mb-3 shadow-lg ${
                profileRSE.color === "blue"
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white"
                  : profileRSE.color === "green"
                  ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white"
                  : "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
              }`}
            >
              {profileRSE.label}
            </motion.div>
            <p className={`text-sm sm:text-base md:text-lg mt-4 leading-relaxed ${
              profileRSE.color === "blue" ? "text-blue-900" : profileRSE.color === "green" ? "text-green-900" : "text-purple-900"
            }`}>
              {profileRSE.message}
            </p>
          </motion.div>

          {/* Gestes sélectionnés avec design moderne */}
          {Object.keys(handlers.gestureSelections).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-6 sm:mb-8 bg-white/80 backdrop-blur-sm rounded-2xl p-5 sm:p-6 shadow-lg border-2 border-green-200"
            >
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-5">
                Les gestes que vous avez sélectionnés :
              </h3>
              <div className="space-y-3 sm:space-y-4">
                {Object.entries(handlers.gestureSelections).map(([gestureId, selection], index: number) => {
                  const gesturesSection = handlers.moduleData?.sections.find((s) => s.type === "gestures");
                  const gesture = gesturesSection?.gestures?.find((g: any) => g.id === gestureId);
                  
                  return (
                    <motion.div
                      key={gestureId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className="flex items-center gap-3 sm:gap-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 sm:p-5 border-2 border-green-300 shadow-md hover:shadow-lg transition-shadow"
                    >
                      <motion.div
                        className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0"
                      >
                        <span className="text-white text-xs font-bold">✓</span>
                      </motion.div>
                      <div className="flex-1">
                        <span className="text-sm sm:text-base font-bold text-gray-900 block mb-1">{gesture?.title || gestureId}</span>
                        <span className={`inline-block px-3 py-1 rounded-lg text-xs sm:text-sm font-bold ${
                          selection === "Déjà fait"
                            ? "bg-green-500 text-white"
                            : selection === "Je vais le faire"
                            ? "bg-blue-500 text-white"
                            : "bg-yellow-500 text-white"
                        }`}>
                          {selection}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Première action avec design moderne */}
          {Object.keys(handlers.firstAction).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mb-6 sm:mb-8 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 sm:p-6 shadow-lg border-2 border-indigo-300"
            >
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-5">
                Votre première action RSE définie :
              </h3>
              <div className="space-y-3 sm:space-y-4 bg-white/80 rounded-xl p-4 sm:p-5 border border-indigo-200">
                {handlers.firstAction.action_name && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
                  >
                    <span className="font-bold text-gray-900 text-sm sm:text-base min-w-[100px] sm:min-w-[120px]">Action :</span>
                    <span className="text-sm sm:text-base text-gray-700 font-medium">{handlers.firstAction.action_name}</span>
                  </motion.div>
                )}
                {handlers.firstAction.responsible && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.65 }}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
                  >
                    <span className="font-bold text-gray-900 text-sm sm:text-base min-w-[100px] sm:min-w-[120px]">Responsable :</span>
                    <span className="text-sm sm:text-base text-gray-700 font-medium">{handlers.firstAction.responsible}</span>
                  </motion.div>
                )}
                {handlers.firstAction.objective && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 }}
                    className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4"
                  >
                    <span className="font-bold text-gray-900 text-sm sm:text-base min-w-[100px] sm:min-w-[120px]">Objectif :</span>
                    <span className="text-sm sm:text-base text-gray-700 font-medium flex-1">{handlers.firstAction.objective}</span>
                  </motion.div>
                )}
                {handlers.firstAction.deadline && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.75 }}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
                  >
                    <span className="font-bold text-gray-900 text-sm sm:text-base min-w-[100px] sm:min-w-[120px]">Délai :</span>
                    <span className="text-sm sm:text-base text-gray-700 font-medium">{handlers.firstAction.deadline}</span>
                  </motion.div>
                )}
                {handlers.firstAction.indicator && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 }}
                    className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4"
                  >
                    <span className="font-bold text-gray-900 text-sm sm:text-base min-w-[100px] sm:min-w-[120px]">Indicateur :</span>
                    <span className="text-sm sm:text-base text-gray-700 font-medium flex-1">{handlers.firstAction.indicator}</span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* Parties prenantes sélectionnées avec design moderne */}
          {handlers.stakeholderSelection.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mb-6 sm:mb-8 bg-white/80 backdrop-blur-sm rounded-2xl p-5 sm:p-6 shadow-lg border-2 border-purple-200"
            >
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-5">
                Vos parties prenantes prioritaires :
              </h3>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {handlers.stakeholderSelection.map((stakeholder, index) => (
                  <motion.span
                    key={stakeholder}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    className="px-4 sm:px-5 py-2 sm:py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-lg hover:shadow-xl transition-shadow"
                  >
                    {stakeholder}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          )}

          {/* Message final */}
          {section.finalMessage && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-sm sm:text-base md:text-lg text-gray-700 mb-6 sm:mb-8 italic text-center leading-relaxed bg-white/60 rounded-xl p-4 sm:p-5 border border-gray-200"
            >
              {section.finalMessage}
            </motion.p>
          )}
          
          {/* Prochaine étape */}
          {section.nextStep && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl p-5 sm:p-6 md:p-8 border-2 border-indigo-300 shadow-xl"
            >
              <h4 className="text-lg sm:text-xl font-bold text-indigo-900 mb-3 sm:mb-4">
                {section.nextStep.title}
              </h4>
              <div className="space-y-2 sm:space-y-3">
                <p className="text-base sm:text-lg font-bold text-indigo-800">{section.nextStep.module}</p>
                <p className="text-sm sm:text-base text-indigo-700 leading-relaxed">{section.nextStep.description}</p>
              </div>
            </motion.div>
          )}
        </motion.div>
      );

    default:
      return <div>Section non reconnue</div>;
  }
}
