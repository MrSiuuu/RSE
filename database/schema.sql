-- ============================================
-- SCHEMA COMPLET BASE DE DONNÉES RSE APP
-- Supprime tout puis recrée tout
-- Exécute dans Supabase SQL Editor
-- ============================================

-- ============================================
-- PARTIE 1 : SUPPRIMER TOUT
-- BONNE PRATIQUE : Tables avec CASCADE en premier
-- ============================================

-- 1. Supprimer les vues
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

-- 3. Supprimer le trigger sur auth.users (table système)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    END IF;
END $$;

-- 4. Supprimer les fonctions
DROP FUNCTION IF EXISTS generate_access_code(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS is_access_code_valid(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS calculate_session_score() CASCADE;
DROP FUNCTION IF EXISTS increment_access_code_uses() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- ============================================
-- PARTIE 2 : CRÉER TOUT
-- ============================================

-- Extension pour générer des UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: modules
CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    number INTEGER UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_duration_minutes INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT false,
    content JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: access_codes
CREATE TABLE IF NOT EXISTS access_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    label VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT code_format CHECK (char_length(code) >= 4 AND char_length(code) <= 20)
);

-- Table: participants
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    access_code_id UUID NOT NULL REFERENCES access_codes(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: sessions
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE RESTRICT,
    access_code_id UUID NOT NULL REFERENCES access_codes(id) ON DELETE RESTRICT,
    status VARCHAR(50) DEFAULT 'started',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    score INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    responses_data JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT status_check CHECK (status IN ('started', 'in_progress', 'completed', 'abandoned'))
);

-- Table: questions
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    order_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    explanation TEXT,
    points INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(module_id, order_number)
);

-- Table: question_options
CREATE TABLE IF NOT EXISTS question_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false,
    order_number INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(question_id, order_number)
);

-- Table: participant_responses
CREATE TABLE IF NOT EXISTS participant_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
    selected_option_id UUID NOT NULL REFERENCES question_options(id) ON DELETE RESTRICT,
    is_correct BOOLEAN NOT NULL,
    answered_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, question_id)
);

-- Table: whatsapp_messages
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    whatsapp_group_link VARCHAR(500),
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: admin_settings
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_access_codes_code ON access_codes(code);
CREATE INDEX IF NOT EXISTS idx_access_codes_active ON access_codes(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_participants_access_code ON participants(access_code_id);
CREATE INDEX IF NOT EXISTS idx_participants_created_at ON participants(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_participant ON sessions(participant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_module ON sessions(module_id);
CREATE INDEX IF NOT EXISTS idx_sessions_access_code ON sessions(access_code_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_completed_at ON sessions(completed_at);
CREATE INDEX IF NOT EXISTS idx_questions_module ON questions(module_id, order_number);
CREATE INDEX IF NOT EXISTS idx_question_options_question ON question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_participant_responses_session ON participant_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_participant_responses_question ON participant_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_session ON whatsapp_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_participant ON whatsapp_messages(participant_id);

-- Fonction: update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Fonction: increment_access_code_uses
CREATE OR REPLACE FUNCTION increment_access_code_uses()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE access_codes
    SET current_uses = current_uses + 1
    WHERE id = NEW.access_code_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Fonction: calculate_session_score
CREATE OR REPLACE FUNCTION calculate_session_score()
RETURNS TRIGGER AS $$
DECLARE
    total_q INTEGER;
    correct_q INTEGER;
    final_score INTEGER;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE is_correct = true)
    INTO total_q, correct_q
    FROM participant_responses
    WHERE session_id = NEW.session_id;
    
    IF total_q > 0 THEN
        final_score := ROUND((correct_q::DECIMAL / total_q::DECIMAL) * 100);
    ELSE
        final_score := 0;
    END IF;
    
    UPDATE sessions
    SET 
        correct_answers = correct_q,
        total_questions = total_q,
        score = final_score,
        status = 'completed',
        completed_at = NOW(),
        duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
    WHERE id = NEW.session_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Fonction: is_access_code_valid
CREATE OR REPLACE FUNCTION is_access_code_valid(code_to_check VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    code_record RECORD;
BEGIN
    SELECT * INTO code_record
    FROM access_codes
    WHERE code = code_to_check;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    IF code_record.is_active = false THEN
        RETURN false;
    END IF;
    
    IF code_record.expires_at IS NOT NULL AND code_record.expires_at < NOW() THEN
        RETURN false;
    END IF;
    
    IF code_record.max_uses IS NOT NULL AND code_record.current_uses >= code_record.max_uses THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: generate_access_code
CREATE OR REPLACE FUNCTION generate_access_code(length INTEGER DEFAULT 6)
RETURNS VARCHAR AS $$
DECLARE
    chars VARCHAR := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result VARCHAR := '';
    i INTEGER;
BEGIN
    FOR i IN 1..length LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
    END LOOP;
    
    WHILE EXISTS (SELECT 1 FROM access_codes WHERE code = result) LOOP
        result := '';
        FOR i IN 1..length LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
        END LOOP;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_access_codes_updated_at BEFORE UPDATE ON access_codes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_settings_updated_at BEFORE UPDATE ON admin_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER increment_code_uses AFTER INSERT ON participants
    FOR EACH ROW EXECUTE FUNCTION increment_access_code_uses();

CREATE TRIGGER calculate_session_score_trigger AFTER INSERT ON participant_responses
    FOR EACH ROW EXECUTE FUNCTION calculate_session_score();

-- Vues
CREATE VIEW access_code_stats AS
SELECT 
    ac.id,
    ac.code,
    ac.label,
    ac.is_active,
    ac.current_uses,
    ac.max_uses,
    COUNT(DISTINCT p.id) as total_participants,
    COUNT(DISTINCT s.id) as total_sessions,
    COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'completed') as completed_sessions,
    AVG(s.score) FILTER (WHERE s.status = 'completed') as average_score,
    MIN(s.completed_at) as first_completion,
    MAX(s.completed_at) as last_completion
FROM access_codes ac
LEFT JOIN participants p ON p.access_code_id = ac.id
LEFT JOIN sessions s ON s.access_code_id = ac.id
GROUP BY ac.id, ac.code, ac.label, ac.is_active, ac.current_uses, ac.max_uses;

CREATE VIEW session_details AS
SELECT 
    s.id as session_id,
    s.status,
    s.score,
    s.total_questions,
    s.correct_answers,
    s.started_at,
    s.completed_at,
    s.duration_seconds,
    p.id as participant_id,
    p.name as participant_name,
    ac.code as access_code,
    ac.label as access_code_label,
    m.title as module_title,
    m.number as module_number
FROM sessions s
JOIN participants p ON p.id = s.participant_id
JOIN access_codes ac ON ac.id = s.access_code_id
JOIN modules m ON m.id = s.module_id;

CREATE VIEW session_responses_detail AS
SELECT 
    pr.id,
    pr.session_id,
    pr.question_id,
    q.order_number as question_order,
    q.question_text,
    qo.id as selected_option_id,
    qo.option_text as selected_option_text,
    qo.is_correct as is_selected_correct,
    pr.is_correct,
    pr.answered_at
FROM participant_responses pr
JOIN questions q ON q.id = pr.question_id
JOIN question_options qo ON qo.id = pr.selected_option_id;

-- Row Level Security
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Modules actifs sont publics" ON modules
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admin peut modifier modules" ON modules
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Codes accessibles en lecture" ON access_codes
    FOR SELECT USING (true);

CREATE POLICY "Admin peut créer codes" ON access_codes
    FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admin peut modifier codes" ON access_codes
    FOR UPDATE 
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admin peut supprimer codes" ON access_codes
    FOR DELETE 
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Participants accessibles en lecture" ON participants
    FOR SELECT USING (true);

CREATE POLICY "Création participant publique" ON participants
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Sessions accessibles en lecture" ON sessions
    FOR SELECT USING (true);

CREATE POLICY "Création session publique" ON sessions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Mise à jour session publique" ON sessions
    FOR UPDATE USING (true);

CREATE POLICY "Questions publiques pour modules actifs" ON questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM modules m 
            WHERE m.id = questions.module_id 
            AND m.is_active = true
        )
    );

CREATE POLICY "Admin peut modifier questions" ON questions
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Options publiques" ON question_options
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM questions q
            JOIN modules m ON m.id = q.module_id
            WHERE q.id = question_options.question_id
            AND m.is_active = true
        )
    );

CREATE POLICY "Admin peut modifier options" ON question_options
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Création réponse publique" ON participant_responses
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Réponses accessibles en lecture" ON participant_responses
    FOR SELECT USING (true);

CREATE POLICY "Création message WhatsApp publique" ON whatsapp_messages
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin peut lire messages WhatsApp" ON whatsapp_messages
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Settings accessibles en lecture" ON admin_settings
    FOR SELECT USING (true);

CREATE POLICY "Admin peut modifier settings" ON admin_settings
    FOR ALL USING (auth.role() = 'authenticated');

-- Données initiales
INSERT INTO modules (number, title, description, estimated_duration_minutes, is_active, content)
VALUES (
    1,
    'Module 1 - Niveau Débutant',
    'Introduction à la RSE pour PME africaines',
    30,
    true,
    '{"sections": []}'::jsonb
) ON CONFLICT (number) DO UPDATE SET is_active = true;
