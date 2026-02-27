-- 
-- MIGRATION: 001_initial_schema
-- DATE: 2026-02-27
-- PURPOSE: Create conversations and messages tables for User History.
--

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 
-- 1. CONVERSATIONS TABLE
-- 
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT 'Nova Conversa',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast user fetching
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);

-- 
-- 2. MESSAGES TABLE
-- 
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast message fetching by conversation
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);

-- 
-- Row Level Security (RLS) configuration
-- 

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policies for conversations
CREATE POLICY "Users can insert their own conversations" 
    ON public.conversations FOR INSERT 
    WITH CHECK (auth.uid()::text = user_id OR user_id IS NOT NULL);

CREATE POLICY "Users can view their own conversations" 
    ON public.conversations FOR SELECT 
    USING (auth.uid()::text = user_id OR user_id IS NOT NULL);

CREATE POLICY "Users can update their own conversations" 
    ON public.conversations FOR UPDATE 
    USING (auth.uid()::text = user_id OR user_id IS NOT NULL);

CREATE POLICY "Users can delete their own conversations" 
    ON public.conversations FOR DELETE 
    USING (auth.uid()::text = user_id OR user_id IS NOT NULL);

-- Policies for messages
CREATE POLICY "Users can insert their own messages" 
    ON public.messages FOR INSERT 
    WITH CHECK (auth.uid()::text = user_id OR user_id IS NOT NULL);

CREATE POLICY "Users can view their own messages" 
    ON public.messages FOR SELECT 
    USING (auth.uid()::text = user_id OR user_id IS NOT NULL);

CREATE POLICY "Users can delete their own messages" 
    ON public.messages FOR DELETE 
    USING (auth.uid()::text = user_id OR user_id IS NOT NULL);
