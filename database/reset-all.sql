-- ============================================
-- RESET COMPLET DE LA BASE DE DONNÉES
-- Supprime TOUT pour repartir à zéro
-- Exécute ce script dans Supabase SQL Editor
-- ============================================

-- ATTENTION : Ce script supprime TOUT
-- Assure-toi d'avoir sauvegardé tes données si nécessaire

-- ============================================
-- BONNE PRATIQUE POSTGRESQL :
-- Supprimer les tables avec CASCADE en premier
-- Cela supprime automatiquement triggers, policies, index, etc.
-- ============================================

-- 1. Supprimer les vues (elles dépendent des tables)
DROP VIEW IF EXISTS session_responses_detail CASCADE;
DROP VIEW IF EXISTS session_details CASCADE;
DROP VIEW IF EXISTS access_code_stats CASCADE;

-- 2. Supprimer les tables avec CASCADE (supprime automatiquement triggers, policies, index)
-- Ordre : tables dépendantes en premier
DROP TABLE IF EXISTS whatsapp_messages CASCADE;
DROP TABLE IF EXISTS participant_responses CASCADE;
DROP TABLE IF EXISTS question_options CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS participants CASCADE;
DROP TABLE IF EXISTS access_codes CASCADE;
DROP TABLE IF EXISTS admin_settings CASCADE;
DROP TABLE IF EXISTS modules CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 3. Supprimer le trigger sur auth.users (table système, doit être fait séparément)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    END IF;
END $$;

-- 4. Supprimer les fonctions (après les tables pour éviter les dépendances)
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS current_user_role() CASCADE;
DROP FUNCTION IF EXISTS get_user_stats() CASCADE;
DROP FUNCTION IF EXISTS generate_access_code(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS is_access_code_valid(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS calculate_session_score() CASCADE;
DROP FUNCTION IF EXISTS increment_access_code_uses() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================
-- VÉRIFICATION
-- ============================================
SELECT 'Reset terminé. Tu peux maintenant exécuter schema.sql' as message;

-- Vérifier qu'il ne reste plus de tables (sauf les tables système)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
