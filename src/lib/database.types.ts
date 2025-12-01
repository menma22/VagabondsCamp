export type Json = any;

export interface Database {
  public: {
    Tables: {
      calendar_events: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          event_date: string;
          start_time: string | null;
          end_time: string | null;
          color: string;
          created_at: string;
          updated_at: string;
          event_type: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string;
          event_date: string;
          start_time?: string | null;
          end_time?: string | null;
          color?: string;
          created_at?: string;
          updated_at?: string;
          event_type?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string;
          event_date?: string;
          start_time?: string | null;
          end_time?: string | null;
          color?: string;
          created_at?: string;
          updated_at?: string;
          event_type?: string | null;
        };
      };
      event_types: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          icon: string;
          is_custom: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          icon?: string;
          is_custom?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          icon?: string;
          is_custom?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      meeting_minutes: {
        Row: {
          id: number;
          content: string;
          created_at: string;
          user_id: string | null;
          decisions: Json;
          shared_information: Json;
        };
        Insert: {
          id?: number;
          content: string;
          created_at?: string;
          user_id?: string | null;
          decisions?: Json;
          shared_information?: Json;
        };
        Update: {
          id?: number;
          content?: string;
          created_at?: string;
          user_id?: string | null;
          decisions?: Json;
          shared_information?: Json;
        };
      };
      meeting_speakers: {
        Row: {
          id: string;
          meeting_id: string;
          speaker_id: string;
          segments: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          speaker_id: string;
          segments?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          speaker_id?: string;
          segments?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      meetings: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          transcript: string;
          formatted_minutes: string;
          created_at: string;
          updated_at: string;
          agenda: string;
          todos: Json;
          reference_urls: Json;
          notes: string;
          meeting_date: string;
          decisions: Json;
          shared_information: Json;
          project_id: string | null;
          audio_url: string | null;
          audio_size: number | null;
          transcription_status: string;
          transcription_error: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          transcript?: string;
          formatted_minutes?: string;
          created_at?: string;
          updated_at?: string;
          agenda?: string;
          todos?: Json;
          reference_urls?: Json;
          notes?: string;
          meeting_date?: string;
          decisions?: Json;
          shared_information?: Json;
          project_id?: string | null;
          audio_url?: string | null;
          audio_size?: number | null;
          transcription_status?: string;
          transcription_error?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          transcript?: string;
          formatted_minutes?: string;
          created_at?: string;
          updated_at?: string;
          agenda?: string;
          todos?: Json;
          reference_urls?: Json;
          notes?: string;
          meeting_date?: string;
          decisions?: Json;
          shared_information?: Json;
          project_id?: string | null;
          audio_url?: string | null;
          audio_size?: number | null;
          transcription_status?: string;
          transcription_error?: string | null;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      speakers: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          voice_embedding: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string;
          voice_embedding?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string;
          voice_embedding?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          gemini_api_key: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          gemini_api_key?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          gemini_api_key?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never
    };
    Functions: {
      [_ in never]: never
    };
    Enums: {
      [_ in never]: never
    };
    CompositeTypes: {
      [_ in never]: never
    };
  };
}
