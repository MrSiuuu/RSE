-- Migration: Ajouter champ responses_data JSONB à la table sessions
-- Exécute dans Supabase SQL Editor

-- Ajouter le champ responses_data JSONB pour stocker les réponses complètes
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS responses_data JSONB DEFAULT NULL;

-- Commentaire pour documenter le champ
COMMENT ON COLUMN sessions.responses_data IS 'Stocke les réponses complètes du participant : quiz_answers, gesture_selections, first_action';
