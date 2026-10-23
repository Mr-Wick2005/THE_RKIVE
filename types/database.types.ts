export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'SUPER_ADMIN' | 'DEPARTMENT_ADMIN';

export type MagazineStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'ARCHIVED';

export type MagazineProcessingStatus =
  | 'NOT_STARTED'
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

export type PaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'MANUAL_VERIFICATION_PENDING'
  | 'REFUNDED'
  | 'EXEMPT';

export type PaymentMethodType =
  | 'RAZORPAY'
  | 'RAZORPAY_QR'
  | 'MANUAL_UPI'
  | 'INSTITUTIONAL_EXEMPTION';

export interface Database {
  public: {
    Tables: {
      departments: {
        Row: {
          id: string;
          name: string;
          short_name: string;
          slug: string;
          description: string | null;
          logo_url: string | null;
          cover_image_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          short_name: string;
          slug: string;
          description?: string | null;
          logo_url?: string | null;
          cover_image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          short_name?: string;
          slug?: string;
          description?: string | null;
          logo_url?: string | null;
          cover_image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: UserRole;
          department_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          role?: UserRole;
          department_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          role?: UserRole;
          department_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey";
            columns: ["department_id"];
            referencedRelation: "departments";
            referencedColumns: ["id"];
          }
        ];
      };
      magazines: {
        Row: {
          id: string;
          slug: string;
          department_id: string;
          title: string;
          subtitle: string | null;
          description: string | null;
          academic_year: string;
          edition: string | null;
          volume: string | null;
          issue: string | null;
          cover_image_url: string | null;
          original_pdf_url: string | null;
          page_count: number;
          status: MagazineStatus;
          processing_status: MagazineProcessingStatus;
          processing_error: string | null;
          rejection_reason: string | null;
          processing_started_at: string | null;
          processing_completed_at: string | null;
          processed_at: string | null;
          created_by: string;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          department_id: string;
          title: string;
          subtitle?: string | null;
          description?: string | null;
          academic_year: string;
          edition?: string | null;
          volume?: string | null;
          issue?: string | null;
          cover_image_url?: string | null;
          original_pdf_url?: string | null;
          page_count?: number;
          status?: MagazineStatus;
          processing_status?: MagazineProcessingStatus;
          processing_error?: string | null;
          rejection_reason?: string | null;
          processing_started_at?: string | null;
          processing_completed_at?: string | null;
          processed_at?: string | null;
          created_by: string;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          department_id?: string;
          title?: string;
          subtitle?: string | null;
          description?: string | null;
          academic_year?: string;
          edition?: string | null;
          volume?: string | null;
          issue?: string | null;
          cover_image_url?: string | null;
          original_pdf_url?: string | null;
          page_count?: number;
          status?: MagazineStatus;
          processing_status?: MagazineProcessingStatus;
          processing_error?: string | null;
          rejection_reason?: string | null;
          processing_started_at?: string | null;
          processing_completed_at?: string | null;
          processed_at?: string | null;
          created_by?: string;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "magazines_department_id_fkey";
            columns: ["department_id"];
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "magazines_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      magazine_pages: {
        Row: {
          id: string;
          magazine_id: string;
          page_number: number;
          image_path: string;
          thumbnail_path: string;
          width: number;
          height: number;
          file_size: number;
          mime_type: string;
          render_version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          magazine_id: string;
          page_number: number;
          image_path: string;
          thumbnail_path: string;
          width: number;
          height: number;
          file_size?: number;
          mime_type?: string;
          render_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          magazine_id?: string;
          page_number?: number;
          image_path?: string;
          thumbnail_path?: string;
          width?: number;
          height?: number;
          file_size?: number;
          mime_type?: string;
          render_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "magazine_pages_magazine_id_fkey";
            columns: ["magazine_id"];
            referencedRelation: "magazines";
            referencedColumns: ["id"];
          }
        ];
      };
      magazine_status_history: {
        Row: {
          id: string;
          magazine_id: string;
          from_status: MagazineStatus | null;
          to_status: MagazineStatus;
          changed_by: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          magazine_id: string;
          from_status?: MagazineStatus | null;
          to_status: MagazineStatus;
          changed_by?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          magazine_id?: string;
          from_status?: MagazineStatus | null;
          to_status?: MagazineStatus;
          changed_by?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "magazine_status_history_magazine_id_fkey";
            columns: ["magazine_id"];
            referencedRelation: "magazines";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "magazine_status_history_changed_by_fkey";
            columns: ["changed_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      pdf_processing_jobs: {
        Row: {
          id: string;
          magazine_id: string;
          status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
          attempts: number;
          max_attempts: number;
          available_at: string;
          locked_at: string | null;
          locked_by: string | null;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          magazine_id: string;
          status?: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
          attempts?: number;
          max_attempts?: number;
          available_at?: string;
          locked_at?: string | null;
          locked_by?: string | null;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          magazine_id?: string;
          status?: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
          attempts?: number;
          max_attempts?: number;
          available_at?: string;
          locked_at?: string | null;
          locked_by?: string | null;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pdf_processing_jobs_magazine_id_fkey";
            columns: ["magazine_id"];
            referencedRelation: "magazines";
            referencedColumns: ["id"];
          }
        ];
      };
      platform_settings: {
        Row: {
          key: string;
          value_paise: number;
          currency: string;
          is_active: boolean;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          key: string;
          value_paise: number;
          currency?: string;
          is_active?: boolean;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value_paise?: number;
          currency?: string;
          is_active?: boolean;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      platform_fee_audit_logs: {
        Row: {
          id: string;
          previous_fee_paise: number;
          new_fee_paise: number;
          changed_by: string | null;
          change_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          previous_fee_paise: number;
          new_fee_paise: number;
          changed_by?: string | null;
          change_reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          previous_fee_paise?: number;
          new_fee_paise?: number;
          changed_by?: string | null;
          change_reason?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      magazine_payments: {
        Row: {
          id: string;
          magazine_id: string;
          department_id: string;
          amount_paise: number;
          currency: string;
          status: PaymentStatus;
          payment_method: PaymentMethodType;
          fee_snapshot_paise: number;
          paid_at: string | null;
          verified_by: string | null;
          verified_at: string | null;
          rejection_reason: string | null;
          created_by: string;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          magazine_id: string;
          department_id: string;
          amount_paise: number;
          currency?: string;
          status?: PaymentStatus;
          payment_method?: PaymentMethodType;
          fee_snapshot_paise: number;
          paid_at?: string | null;
          verified_by?: string | null;
          verified_at?: string | null;
          rejection_reason?: string | null;
          created_by: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          magazine_id?: string;
          department_id?: string;
          amount_paise?: number;
          currency?: string;
          status?: PaymentStatus;
          payment_method?: PaymentMethodType;
          fee_snapshot_paise?: number;
          paid_at?: string | null;
          verified_by?: string | null;
          verified_at?: string | null;
          rejection_reason?: string | null;
          created_by?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payment_attempts: {
        Row: {
          id: string;
          obligation_id: string;
          magazine_id: string;
          provider: string;
          provider_order_id: string;
          provider_payment_id: string | null;
          provider_signature: string | null;
          amount_paise: number;
          currency: string;
          status: string;
          error_code: string | null;
          error_description: string | null;
          idempotency_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          obligation_id: string;
          magazine_id: string;
          provider?: string;
          provider_order_id: string;
          provider_payment_id?: string | null;
          provider_signature?: string | null;
          amount_paise: number;
          currency?: string;
          status?: string;
          error_code?: string | null;
          error_description?: string | null;
          idempotency_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          obligation_id?: string;
          magazine_id?: string;
          provider?: string;
          provider_order_id?: string;
          provider_payment_id?: string | null;
          provider_signature?: string | null;
          amount_paise?: number;
          currency?: string;
          status?: string;
          error_code?: string | null;
          error_description?: string | null;
          idempotency_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      manual_upi_claims: {
        Row: {
          id: string;
          obligation_id: string;
          magazine_id: string;
          department_id: string;
          utr_reference: string;
          amount_paise: number;
          submitted_by: string;
          status: 'PENDING' | 'VERIFIED' | 'REJECTED';
          verified_by: string | null;
          verified_at: string | null;
          rejection_reason: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          obligation_id: string;
          magazine_id: string;
          department_id: string;
          utr_reference: string;
          amount_paise: number;
          submitted_by: string;
          status?: 'PENDING' | 'VERIFIED' | 'REJECTED';
          verified_by?: string | null;
          verified_at?: string | null;
          rejection_reason?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          obligation_id?: string;
          magazine_id?: string;
          department_id?: string;
          utr_reference?: string;
          amount_paise?: number;
          submitted_by?: string;
          status?: 'PENDING' | 'VERIFIED' | 'REJECTED';
          verified_by?: string | null;
          verified_at?: string | null;
          rejection_reason?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payment_webhook_events: {
        Row: {
          id: string;
          event_id: string;
          event_type: string;
          provider_order_id: string | null;
          provider_payment_id: string | null;
          payload_summary: Json;
          status: string;
          processed_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          event_type: string;
          provider_order_id?: string | null;
          provider_payment_id?: string | null;
          payload_summary?: Json;
          status?: string;
          processed_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          event_type?: string;
          provider_order_id?: string | null;
          provider_payment_id?: string | null;
          payload_summary?: Json;
          status?: string;
          processed_at?: string;
        };
        Relationships: [];
      };
      payment_audit_logs: {
        Row: {
          id: string;
          event_type: string;
          magazine_id: string | null;
          obligation_id: string | null;
          actor_id: string | null;
          actor_role: string | null;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_type: string;
          magazine_id?: string | null;
          obligation_id?: string | null;
          actor_id?: string | null;
          actor_role?: string | null;
          details?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_type?: string;
          magazine_id?: string | null;
          obligation_id?: string | null;
          actor_id?: string | null;
          actor_role?: string | null;
          details?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {
      get_user_role: {
        Args: { user_id: string };
        Returns: UserRole;
      };
      get_user_department_id: {
        Args: { user_id: string };
        Returns: string | null;
      };
      is_super_admin: {
        Args: { user_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      magazine_status: MagazineStatus;
      magazine_processing_status: MagazineProcessingStatus;
      payment_status: PaymentStatus;
      payment_method_type: PaymentMethodType;
    };
    CompositeTypes: {};
  };
}
