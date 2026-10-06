/**
 * Supabase Database & Entity Types for Void Reader
 */

export interface Profile {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  created_at?: string;
}

export interface CloudBookmark {
  id?: string;
  user_id: string;
  manga_id: string;
  title: string;
  cover?: string;
  type?: string;
  latest_chapter?: string;
  source_id?: string;
  created_at?: string;
}

export interface CloudHistory {
  id?: string;
  user_id: string;
  manga_id: string;
  title?: string;
  cover?: string;
  chapter_id: string;
  chapter_title?: string;
  progress?: number;
  source_id?: string;
  updated_at?: string;
}

export interface CloudReadingProgress {
  id?: string;
  user_id: string;
  chapter_id: string;
  manga_id?: string;
  page: number;
  scroll_position: number;
  updated_at?: string;
}

export interface CloudSettings {
  id?: string;
  user_id: string;
  theme: "dark" | "oled";
  image_quality: "hd" | "medium" | "low";
  reading_mode: "vertical" | "paged";
  default_source?: string;
  updated_at?: string;
}

export interface CloudComment {
  id: string;
  user_id: string;
  manga_id: string;
  username: string;
  avatar_url?: string;
  content: string;
  spoiler: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ChapterComment {
  id: string;
  source_id: string;
  manga_id: string;
  chapter_id: string;
  user_id: string;
  username: string;
  avatar?: string;
  comment: string;
  parent_id?: string | null;
  likes?: number;
  liked_by?: string[];
  created_at: string;
}
