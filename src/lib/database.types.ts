export interface Database {
  public: {
    Tables: {
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
      meetings: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          transcript: string;
          formatted_minutes: string;
          audio_url: string | null;
          audio_size: number | null;
          transcription_status: 'pending' | 'processing' | 'completed' | 'failed';
          transcription_error: string | null;
          project_id: string | null;
          created_at: string;
          updated_at: string;
          todos: any[];
          decisions: any[];
          shared_information: any[];
          reference_urls: any[];
          notes: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          transcript?: string;
          formatted_minutes?: string;
          audio_url?: string | null;
          audio_size?: number | null;
          transcription_status?: 'pending' | 'processing' | 'completed' | 'failed';
          transcription_error?: string | null;
          project_id?: string | null;
          created_at?: string;
          updated_at?: string;
          todos?: any[];
          decisions?: any[];
          shared_information?: any[];
          reference_urls?: any[];
          notes?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          transcript?: string;
          formatted_minutes?: string;
          audio_url?: string | null;
          audio_size?: number | null;
          transcription_status?: 'pending' | 'processing' | 'completed' | 'failed';
          transcription_error?: string | null;
          project_id?: string | null;
          created_at?: string;
          updated_at?: string;
          todos?: any[];
          decisions?: any[];
          shared_information?: any[];
          reference_urls?: any[];
          notes?: string;
        };
      };
    };
  };
}
