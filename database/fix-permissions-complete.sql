-- ============================================
-- SOLUTION COMPLÈTE POUR CORRIGER LES PERMISSIONS
-- Ce script corrige TOUT : GRANT + RLS + Vérifications
-- ============================================

-- ============================================
-- ÉTAPE 1 : ACCORDER LES PRIVILÈGES SUR LES TABLES
-- ============================================

-- Privilèges sur le schéma public
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Privilèges sur TOUTES les tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.modules TO postgres, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.access_codes TO postgres, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.participants TO postgres, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sessions TO postgres, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.questions TO postgres, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.question_options TO postgres, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.participant_responses TO postgres, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.whatsapp_messages TO postgres, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_settings TO postgres, anon, authenticated, service_role;

-- Privilèges sur les séquences (si elles existent)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Privilèges par défaut pour les futures tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

-- ============================================
-- ÉTAPE 2 : SUPPRIMER TOUTES LES ANCIENNES POLITIQUES RLS
-- ============================================

-- Supprimer toutes les politiques sur access_codes
DROP POLICY IF EXISTS "Codes accessibles en lecture" ON access_codes;
DROP POLICY IF EXISTS "Admin peut gérer codes" ON access_codes;
DROP POLICY IF EXISTS "Admin peut créer codes" ON access_codes;
DROP POLICY IF EXISTS "Admin authentifié peut créer codes" ON access_codes;
DROP POLICY IF EXISTS "Authentifiés peuvent créer codes" ON access_codes;
DROP POLICY IF EXISTS "Admin peut modifier codes" ON access_codes;
DROP POLICY IF EXISTS "Admin authentifié peut modifier codes" ON access_codes;
DROP POLICY IF EXISTS "Authentifiés peuvent modifier codes" ON access_codes;
DROP POLICY IF EXISTS "Admin peut supprimer codes" ON access_codes;
DROP POLICY IF EXISTS "Admin authentifié peut supprimer codes" ON access_codes;
DROP POLICY IF EXISTS "Authentifiés peuvent supprimer codes" ON access_codes;

-- ============================================
-- ÉTAPE 3 : CRÉER LES NOUVELLES POLITIQUES RLS CORRECTES
-- ============================================

-- IMPORTANT : Utiliser "TO authenticated" au lieu de "auth.uid() IS NOT NULL"
-- Car "TO authenticated" vérifie automatiquement le rôle JWT

-- Politique 1 : SELECT - Lecture publique (nécessaire pour vérifier les codes lors de l'accès)
CREATE POLICY "Codes lecture publique" ON access_codes
    FOR SELECT 
    USING (true);

-- Politique 2 : INSERT - Les utilisateurs authentifiés peuvent créer des codes
-- "TO authenticated" = vérifie automatiquement que le JWT a le rôle "authenticated"
CREATE POLICY "Authentifiés peuvent insérer codes" ON access_codes
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- Politique 3 : UPDATE - Les utilisateurs authentifiés peuvent modifier tous les codes
CREATE POLICY "Authentifiés peuvent modifier codes" ON access_codes
    FOR UPDATE 
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Politique 4 : DELETE - Les utilisateurs authentifiés peuvent supprimer tous les codes
CREATE POLICY "Authentifiés peuvent supprimer codes" ON access_codes
    FOR DELETE 
    TO authenticated
    USING (true);

-- ============================================
-- ÉTAPE 4 : VÉRIFIER QUE RLS EST ACTIVÉ
-- ============================================

ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ÉTAPE 5 : VÉRIFICATIONS (pour debug)
-- ============================================

-- Pour vérifier les privilèges :
-- SELECT grantee, privilege_type 
-- FROM information_schema.role_table_grants 
-- WHERE table_name='access_codes' AND grantee IN ('authenticated', 'anon');

-- Pour vérifier les politiques :
-- SELECT policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'access_codes';
