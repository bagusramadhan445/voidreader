-- ====================================================================
-- VOID READER - SUPABASE DATABASE SCHEMA
-- ====================================================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Bookmarks Table
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  manga_id TEXT NOT NULL,
  title TEXT NOT NULL,
  cover TEXT,
  type TEXT DEFAULT 'Manga',
  latest_chapter TEXT,
  source_id TEXT DEFAULT 'komiku',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT unique_user_bookmark UNIQUE (user_id, manga_id)
);

-- 3. Reading History Table
CREATE TABLE IF NOT EXISTS public.history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  manga_id TEXT NOT NULL,
  title TEXT,
  cover TEXT,
  chapter_id TEXT NOT NULL,
  chapter_title TEXT,
  progress NUMERIC DEFAULT 0,
  source_id TEXT DEFAULT 'komiku',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT unique_user_history UNIQUE (user_id, manga_id)
);

-- 4. Reading Progress Table
CREATE TABLE IF NOT EXISTS public.reading_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  chapter_id TEXT NOT NULL,
  manga_id TEXT,
  page INTEGER DEFAULT 0 NOT NULL,
  scroll_position NUMERIC DEFAULT 0 NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT unique_user_progress UNIQUE (user_id, chapter_id)
);

-- 5. User Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  theme TEXT DEFAULT 'dark',
  image_quality TEXT DEFAULT 'hd',
  reading_mode TEXT DEFAULT 'vertical',
  music_enabled BOOLEAN DEFAULT true,
  music_volume NUMERIC DEFAULT 70,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Manga Comments Community Table
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  manga_id TEXT NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  content TEXT NOT NULL,
  spoiler BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Profiles: Public can view, owner can update
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert and update their own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- Bookmarks: Private to user
CREATE POLICY "Users can manage their own bookmarks" ON public.bookmarks
  FOR ALL USING (auth.uid() = user_id);

-- History: Private to user
CREATE POLICY "Users can manage their own history" ON public.history
  FOR ALL USING (auth.uid() = user_id);

-- Reading Progress: Private to user
CREATE POLICY "Users can manage their own progress" ON public.reading_progress
  FOR ALL USING (auth.uid() = user_id);

-- Settings: Private to user
CREATE POLICY "Users can manage their own settings" ON public.settings
  FOR ALL USING (auth.uid() = user_id);

-- Comments: Viewable by everyone, insert/update/delete by author
CREATE POLICY "Comments are viewable by everyone" ON public.comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert comments" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON public.comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.comments
  FOR DELETE USING (auth.uid() = user_id);

-- 7. Universal Chapter-Based Comments Table
CREATE TABLE IF NOT EXISTS public.chapter_comments (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  manga_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  avatar TEXT,
  comment TEXT NOT NULL,
  parent_id TEXT,
  likes INTEGER DEFAULT 0 NOT NULL,
  liked_by TEXT[] DEFAULT '{}' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chapter_comments_identity
  ON public.chapter_comments (source_id, manga_id, chapter_id, created_at DESC);

ALTER TABLE public.chapter_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chapter comments are viewable by everyone" ON public.chapter_comments
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert chapter comments" ON public.chapter_comments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update chapter comments" ON public.chapter_comments
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete own chapter comments" ON public.chapter_comments
  FOR DELETE USING (true);

-- 8. User Follows Table
CREATE TABLE IF NOT EXISTS public.user_follows (
  id TEXT PRIMARY KEY, -- composite e.g. source_id:manga_id:user_id
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source_id TEXT NOT NULL,
  manga_id TEXT NOT NULL,
  title TEXT NOT NULL,
  cover TEXT,
  last_chapter TEXT,
  latest_chapter TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT unique_user_follow_manga UNIQUE (user_id, source_id, manga_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_identity
  ON public.user_follows (user_id, source_id, manga_id);

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own followed manga" ON public.user_follows
  FOR ALL USING (auth.uid() = user_id);

-- 9. Universal Manga Reviews & Ratings Table
CREATE TABLE IF NOT EXISTS public.manga_reviews (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  manga_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  avatar TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_manga_reviews_manga
  ON public.manga_reviews (source_id, manga_id, created_at DESC);

ALTER TABLE public.manga_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manga reviews are viewable by everyone" ON public.manga_reviews
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can post reviews" ON public.manga_reviews
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can edit own reviews" ON public.manga_reviews
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete own reviews" ON public.manga_reviews
  FOR DELETE USING (true);

