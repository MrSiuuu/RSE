-- Correction des politiques RLS pour access_codes
-- Permettre aux utilisateurs authentifiés de gérer les codes

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Codes accessibles en lecture" ON access_codes;
DROP POLICY IF EXISTS "Admin peut gérer codes" ON access_codes;

-- Nouvelle politique : Lecture publique (pour vérifier les codes)
CREATE POLICY "Codes accessibles en lecture" ON access_codes
    FOR SELECT USING (true);

-- Nouvelle politique : Admin authentifié peut insérer
CREATE POLICY "Admin peut créer codes" ON access_codes
    FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

-- Nouvelle politique : Admin authentifié peut modifier ses codes
CREATE POLICY "Admin peut modifier codes" ON access_codes
    FOR UPDATE 
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Nouvelle politique : Admin authentifié peut supprimer ses codes
CREATE POLICY "Admin peut supprimer codes" ON access_codes
    FOR DELETE 
    USING (auth.uid() IS NOT NULL);
