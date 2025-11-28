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
<<<<<<< Updated upstream
          transcription_status: string;
=======
          transcription_status: 'pending' | 'processing' | 'completed' | 'failed';
>>>>>>> Stashed changes
          transcription_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          transcript?: string;
          formatted_minutes?: string;
          audio_url?: string | null;
          audio_size?: number | null;
<<<<<<< Updated upstream
          transcription_status?: string;
=======
          transcription_status?: 'pending' | 'processing' | 'completed' | 'failed';
>>>>>>> Stashed changes
          transcription_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          transcript?: string;
          formatted_minutes?: string;
          audio_url?: string | null;
          audio_size?: number | null;
<<<<<<< Updated upstream
          transcription_status?: string;
=======
          transcription_status?: 'pending' | 'processing' | 'completed' | 'failed';
>>>>>>> Stashed changes
          transcription_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
