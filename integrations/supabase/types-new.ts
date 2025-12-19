export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          revoked_at: string | null
          revoked_by: string | null
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role?: string
          token?: string
        }
        Relationships: []
      }
      analytics_cache: {
        Row: {
          created_at: string
          date: string
          dimensions: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          metric_name: string
          updated_at: string
          value: number | null
        }
        Insert: {
          created_at?: string
          date: string
          dimensions?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metric_name: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          dimensions?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metric_name?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          properties: Json | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          properties?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          properties?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      availability: {
        Row: {
          created_at: string
          custom_price: number | null
          date: string
          id: string
          is_available: boolean | null
          property_id: string
        }
        Insert: {
          created_at?: string
          custom_price?: number | null
          date: string
          id?: string
          is_available?: boolean | null
          property_id: string
        }
        Update: {
          created_at?: string
          custom_price?: number | null
          date?: string
          id?: string
          is_available?: boolean | null
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_dates: {
        Row: {
          created_at: string
          end_date: string
          id: string
          price_override: number | null
          property_id: string
          reason: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          price_override?: number | null
          property_id: string
          reason?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          price_override?: number | null
          property_id?: string
          reason?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_dates_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          check_in_date: string
          check_out_date: string
          created_at: string
          currency: string | null
          guest_email: string | null
          guest_id: string | null
          guest_name: string | null
          guest_phone: string | null
          guests_count: number
          host_id: string
          id: string
          payment_intent_id: string | null
          payment_method: string | null
          payment_status: string | null
          property_id: string
          refund_amount: number | null
          refund_date: string | null
          refund_reason: string | null
          special_requests: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          check_in_date: string
          check_out_date: string
          created_at?: string
          currency?: string | null
          guest_email?: string | null
          guest_id?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          guests_count?: number
          host_id: string
          id?: string
          payment_intent_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          property_id: string
          refund_amount?: number | null
          refund_date?: string | null
          refund_reason?: string | null
          special_requests?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          check_in_date?: string
          check_out_date?: string
          created_at?: string
          currency?: string | null
          guest_email?: string | null
          guest_id?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          guests_count?: number
          host_id?: string
          id?: string
          payment_intent_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          property_id?: string
          refund_amount?: number | null
          refund_date?: string | null
          refund_reason?: string | null
          special_requests?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_sync_logs: {
        Row: {
          calendar_sync_id: string
          created_at: string | null
          error_message: string | null
          events_synced: number | null
          id: string
          status: string
          sync_completed_at: string | null
          sync_started_at: string | null
        }
        Insert: {
          calendar_sync_id: string
          created_at?: string | null
          error_message?: string | null
          events_synced?: number | null
          id?: string
          status: string
          sync_completed_at?: string | null
          sync_started_at?: string | null
        }
        Update: {
          calendar_sync_id?: string
          created_at?: string | null
          error_message?: string | null
          events_synced?: number | null
          id?: string
          status?: string
          sync_completed_at?: string | null
          sync_started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_sync_logs_calendar_sync_id_fkey"
            columns: ["calendar_sync_id"]
            isOneToOne: false
            referencedRelation: "calendar_syncs"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_syncs: {
        Row: {
          created_at: string | null
          external_calendar_url: string | null
          host_id: string
          id: string
          is_active: boolean | null
          last_sync_status: string | null
          last_synced_at: string | null
          property_id: string
          sync_error: string | null
          sync_frequency: string | null
          sync_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          external_calendar_url?: string | null
          host_id: string
          id?: string
          is_active?: boolean | null
          last_sync_status?: string | null
          last_synced_at?: string | null
          property_id: string
          sync_error?: string | null
          sync_frequency?: string | null
          sync_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          external_calendar_url?: string | null
          host_id?: string
          id?: string
          is_active?: boolean | null
          last_sync_status?: string | null
          last_synced_at?: string | null
          property_id?: string
          sync_error?: string | null
          sync_frequency?: string | null
          sync_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_syncs_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_syncs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          booking_id: string | null
          created_at: string | null
          guest_id: string
          guest_unread_count: number | null
          host_id: string
          host_unread_count: number | null
          id: string
          last_message_at: string | null
          property_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          guest_id: string
          guest_unread_count?: number | null
          host_id: string
          host_unread_count?: number | null
          id?: string
          last_message_at?: string | null
          property_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          guest_id?: string
          guest_unread_count?: number | null
          host_id?: string
          host_unread_count?: number | null
          id?: string
          last_message_at?: string | null
          property_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      email_analytics: {
        Row: {
          created_at: string | null
          email_id: string | null
          email_type: string
          event_type: string
          id: string
          metadata: Json | null
          recipient_email: string
        }
        Insert: {
          created_at?: string | null
          email_id?: string | null
          email_type: string
          event_type: string
          id?: string
          metadata?: Json | null
          recipient_email: string
        }
        Update: {
          created_at?: string | null
          email_id?: string | null
          email_type?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          recipient_email?: string
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          click_count: number | null
          created_at: string | null
          id: string
          metadata: Json | null
          name: string
          open_count: number | null
          recipient_count: number | null
          scheduled_at: string | null
          sent_at: string | null
          status: string | null
          subject: string
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          click_count?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          name: string
          open_count?: number | null
          recipient_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          click_count?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          open_count?: number | null
          recipient_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          created_at: string | null
          html_content: string
          id: string
          is_active: boolean | null
          name: string
          subject: string
          text_content: string | null
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          created_at?: string | null
          html_content: string
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          text_content?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          created_at?: string | null
          html_content?: string
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          text_content?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          content: string
          created_at: string | null
          host_id: string | null
          id: string
          is_active: boolean | null
          name: string
          subject: string | null
          template_type: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          host_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subject?: string | null
          template_type: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          host_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string | null
          template_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          booking_id: string | null
          content: string
          conversation_id: string | null
          created_at: string | null
          file_url: string | null
          id: string
          is_read: boolean | null
          is_template: boolean | null
          message_type: string | null
          recipient_id: string
          sender_id: string
          template_type: string | null
          updated_at: string | null
        }
        Insert: {
          booking_id?: string | null
          content: string
          conversation_id?: string | null
          created_at?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          is_template?: boolean | null
          message_type?: string | null
          recipient_id: string
          sender_id: string
          template_type?: string | null
          updated_at?: string | null
        }
        Update: {
          booking_id?: string | null
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          is_template?: boolean | null
          message_type?: string | null
          recipient_id?: string
          sender_id?: string
          template_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_analytics: {
        Row: {
          created_at: string | null
          email: string
          event_type: string
          id: string
          metadata: Json | null
          source: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          event_type: string
          id?: string
          metadata?: Json | null
          source?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          source?: string | null
        }
        Relationships: []
      }
      newsletter_subscriptions: {
        Row: {
          email: string
          id: string
          name: string | null
          source: string | null
          status: string | null
          subscribed_at: string | null
          unsubscribed_at: string | null
          updated_at: string | null
        }
        Insert: {
          email: string
          id?: string
          name?: string | null
          source?: string | null
          status?: string | null
          subscribed_at?: string | null
          unsubscribed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          email?: string
          id?: string
          name?: string | null
          source?: string | null
          status?: string | null
          subscribed_at?: string | null
          unsubscribed_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          email_booking_confirmed: boolean | null
          email_check_in_reminder: boolean | null
          email_message_received: boolean | null
          email_new_booking: boolean | null
          email_review_request: boolean | null
          id: string
          push_notifications: boolean | null
          sms_notifications: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email_booking_confirmed?: boolean | null
          email_check_in_reminder?: boolean | null
          email_message_received?: boolean | null
          email_new_booking?: boolean | null
          email_review_request?: boolean | null
          id?: string
          push_notifications?: boolean | null
          sms_notifications?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email_booking_confirmed?: boolean | null
          email_check_in_reminder?: boolean | null
          email_message_received?: boolean | null
          email_new_booking?: boolean | null
          email_review_request?: boolean | null
          id?: string
          push_notifications?: boolean | null
          sms_notifications?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          booking_id: string
          completed_at: string | null
          created_at: string
          currency: string | null
          failure_code: string | null
          failure_reason: string | null
          id: string
          metadata: Json | null
          payment_method_type: string | null
          status: string
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          stripe_session_id: string | null
          transaction_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id: string
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          failure_code?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          payment_method_type?: string | null
          status: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          stripe_session_id?: string | null
          transaction_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          failure_code?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          payment_method_type?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          stripe_session_id?: string | null
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          is_host: boolean | null
          is_suspended: boolean | null
          is_verified: boolean | null
          last_login_at: string | null
          last_name: string | null
          location: string | null
          login_count: number | null
          phone: string | null
          role: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_host?: boolean | null
          is_suspended?: boolean | null
          is_verified?: boolean | null
          last_login_at?: string | null
          last_name?: string | null
          location?: string | null
          login_count?: number | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_host?: boolean | null
          is_suspended?: boolean | null
          is_verified?: boolean | null
          last_login_at?: string | null
          last_name?: string | null
          location?: string | null
          login_count?: number | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          accuracy_rating: number | null
          address: string | null
          admin_notes: string | null
          advance_notice_hours: number | null
          amenities: string[] | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          availability_rules: Json | null
          bathrooms: number | null
          bedrooms: number | null
          cancellation_policy: string | null
          check_in_time: string | null
          check_out_time: string | null
          city: string
          cleanliness_rating: number | null
          communication_rating: number | null
          country: string
          created_at: string
          description: string | null
          host_id: string
          house_rules: string | null
          id: string
          image_count: number | null
          is_active: boolean | null
          is_featured: boolean | null
          is_verified: boolean | null
          location: string
          location_rating: number | null
          max_guests: number
          max_nights: number | null
          min_nights: number | null
          price_per_night: number
          property_type: string
          rating: number | null
          rejected_reason: string | null
          rejection_notes: string | null
          review_count: number | null
          same_day_booking: boolean | null
          status: string | null
          title: string
          updated_at: string
          value_rating: number | null
        }
        Insert: {
          accuracy_rating?: number | null
          address?: string | null
          admin_notes?: string | null
          advance_notice_hours?: number | null
          amenities?: string[] | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          availability_rules?: Json | null
          bathrooms?: number | null
          bedrooms?: number | null
          cancellation_policy?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          city: string
          cleanliness_rating?: number | null
          communication_rating?: number | null
          country: string
          created_at?: string
          description?: string | null
          host_id: string
          house_rules?: string | null
          id?: string
          image_count?: number | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_verified?: boolean | null
          location: string
          location_rating?: number | null
          max_guests?: number
          max_nights?: number | null
          min_nights?: number | null
          price_per_night: number
          property_type: string
          rating?: number | null
          rejected_reason?: string | null
          rejection_notes?: string | null
          review_count?: number | null
          same_day_booking?: boolean | null
          status?: string | null
          title: string
          updated_at?: string
          value_rating?: number | null
        }
        Update: {
          accuracy_rating?: number | null
          address?: string | null
          admin_notes?: string | null
          advance_notice_hours?: number | null
          amenities?: string[] | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          availability_rules?: Json | null
          bathrooms?: number | null
          bedrooms?: number | null
          cancellation_policy?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          city?: string
          cleanliness_rating?: number | null
          communication_rating?: number | null
          country?: string
          created_at?: string
          description?: string | null
          host_id?: string
          house_rules?: string | null
          id?: string
          image_count?: number | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_verified?: boolean | null
          location?: string
          location_rating?: number | null
          max_guests?: number
          max_nights?: number | null
          min_nights?: number | null
          price_per_night?: number
          property_type?: string
          rating?: number | null
          rejected_reason?: string | null
          rejection_notes?: string | null
          review_count?: number | null
          same_day_booking?: boolean | null
          status?: string | null
          title?: string
          updated_at?: string
          value_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      property_availability: {
        Row: {
          blocked_reason: string | null
          created_at: string | null
          created_by: string | null
          custom_price: number | null
          date: string
          id: string
          is_available: boolean | null
          max_nights: number | null
          min_nights: number | null
          notes: string | null
          property_id: string
          updated_at: string | null
        }
        Insert: {
          blocked_reason?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_price?: number | null
          date: string
          id?: string
          is_available?: boolean | null
          max_nights?: number | null
          min_nights?: number | null
          notes?: string | null
          property_id: string
          updated_at?: string | null
        }
        Update: {
          blocked_reason?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_price?: number | null
          date?: string
          id?: string
          is_available?: boolean | null
          max_nights?: number | null
          min_nights?: number | null
          notes?: string | null
          property_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_availability_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_flags: {
        Row: {
          created_at: string | null
          description: string | null
          flag_type: string
          flagged_by: string | null
          id: string
          property_id: string
          resolution_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          flag_type: string
          flagged_by?: string | null
          id?: string
          property_id: string
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          flag_type?: string
          flagged_by?: string | null
          id?: string
          property_id?: string
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_flags_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_images: {
        Row: {
          caption: string | null
          created_at: string | null
          display_order: number | null
          file_name: string
          file_size: number | null
          height: number | null
          id: string
          is_primary: boolean | null
          mime_type: string | null
          property_id: string
          public_url: string | null
          storage_bucket: string | null
          storage_path: string
          updated_at: string | null
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          file_name: string
          file_size?: number | null
          height?: number | null
          id?: string
          is_primary?: boolean | null
          mime_type?: string | null
          property_id: string
          public_url?: string | null
          storage_bucket?: string | null
          storage_path: string
          updated_at?: string | null
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          file_name?: string
          file_size?: number | null
          height?: number | null
          id?: string
          is_primary?: boolean | null
          mime_type?: string | null
          property_id?: string
          public_url?: string | null
          storage_bucket?: string | null
          storage_path?: string
          updated_at?: string | null
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_moderation_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          notes: string | null
          property_id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          property_id: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_moderation_log_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      review_helpful_votes: {
        Row: {
          created_at: string | null
          id: string
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_helpful_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_images: {
        Row: {
          caption: string | null
          created_at: string | null
          id: string
          image_url: string
          order_index: number | null
          review_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          id?: string
          image_url: string
          order_index?: number | null
          review_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          id?: string
          image_url?: string
          order_index?: number | null
          review_id?: string
        }
        Relationships: []
      }
      review_reports: {
        Row: {
          created_at: string | null
          details: string | null
          id: string
          reason: string
          reporter_id: string
          review_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          review_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          review_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          accuracy_rating: number | null
          booking_id: string | null
          cleanliness_rating: number | null
          communication_rating: number | null
          created_at: string | null
          flagged_reason: string | null
          guest_id: string
          host_response: string | null
          host_response_date: string | null
          id: string
          location_rating: number | null
          overall_rating: number
          property_id: string
          review_text: string | null
          status: string | null
          updated_at: string | null
          value_rating: number | null
        }
        Insert: {
          accuracy_rating?: number | null
          booking_id?: string | null
          cleanliness_rating?: number | null
          communication_rating?: number | null
          created_at?: string | null
          flagged_reason?: string | null
          guest_id: string
          host_response?: string | null
          host_response_date?: string | null
          id?: string
          location_rating?: number | null
          overall_rating: number
          property_id: string
          review_text?: string | null
          status?: string | null
          updated_at?: string | null
          value_rating?: number | null
        }
        Update: {
          accuracy_rating?: number | null
          booking_id?: string | null
          cleanliness_rating?: number | null
          communication_rating?: number | null
          created_at?: string | null
          flagged_reason?: string | null
          guest_id?: string
          host_response?: string | null
          host_response_date?: string | null
          id?: string
          location_rating?: number | null
          overall_rating?: number
          property_id?: string
          review_text?: string | null
          status?: string | null
          updated_at?: string | null
          value_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_events: {
        Row: {
          booking_id: string | null
          created_at: string
          event_id: string
          event_type: string
          id: string
          last_error: string | null
          last_error_at: string | null
          payload: Json | null
          payment_intent_id: string | null
          processed: boolean | null
          processed_at: string | null
          processing_attempts: number | null
          session_id: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          event_id: string
          event_type: string
          id?: string
          last_error?: string | null
          last_error_at?: string | null
          payload?: Json | null
          payment_intent_id?: string | null
          processed?: boolean | null
          processed_at?: string | null
          processing_attempts?: number | null
          session_id?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          event_id?: string
          event_type?: string
          id?: string
          last_error?: string | null
          last_error_at?: string | null
          payload?: Json | null
          payment_intent_id?: string | null
          processed?: boolean | null
          processed_at?: string | null
          processing_attempts?: number | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_webhook_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity: {
        Row: {
          activity_category: string
          activity_type: string
          created_at: string | null
          description: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          profile_id: string | null
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          activity_category: string
          activity_type: string
          created_at?: string | null
          description: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          profile_id?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          activity_category?: string
          activity_type?: string
          created_at?: string | null
          description?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          profile_id?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_property: {
        Args: { p_notes?: string; p_property_id: string }
        Returns: boolean
      }
      calculate_booking_amount: {
        Args: {
          check_in_date: string
          check_out_date: string
          guests_count: number
          property_uuid: string
        }
        Returns: {
          amount: number
          breakdown: Json
          currency: string
          nights: number
          price_per_night: number
        }[]
      }
      check_date_availability: {
        Args: { p_check_in: string; p_check_out: string; p_property_id: string }
        Returns: boolean
      }
      check_property_availability: {
        Args: {
          check_in_date: string
          check_out_date: string
          property_uuid: string
        }
        Returns: {
          blocked_dates: string[]
          booked_dates: string[]
          is_available: boolean
          unavailable_dates: string[]
        }[]
      }
      check_role_consistency: {
        Args: Record<PropertyKey, never>
        Returns: {
          email: string
          is_consistent: boolean
          metadata_role: string
          profile_role: string
          user_id: string
        }[]
      }
      cleanup_abandoned_bookings: {
        Args: Record<PropertyKey, never>
        Returns: {
          booking_ids: string[]
          deleted_count: number
        }[]
      }
      create_missing_profile: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      generate_unique_filename: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_optimized_image_url: {
        Args: {
          height?: number
          image_path: string
          quality?: number
          width?: number
        }
        Returns: string
      }
      get_property_moderation_queue: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          approval_status: string
          created_at: string
          flag_count: number
          host_email: string
          host_name: string
          last_moderation_action: string
          last_moderation_date: string
          property_id: string
          title: string
        }[]
      }
      get_property_pricing: {
        Args: {
          check_in_date: string
          check_out_date: string
          property_uuid: string
        }
        Returns: {
          date: string
          is_custom_price: boolean
          price: number
        }[]
      }
      get_review_summary: {
        Args: { property_uuid: string }
        Returns: {
          average_rating: number
          avg_accuracy: number
          avg_cleanliness: number
          avg_communication: number
          avg_location: number
          avg_value: number
          rating_1_star: number
          rating_2_stars: number
          rating_3_stars: number
          rating_4_stars: number
          rating_5_stars: number
          total_reviews: number
        }[]
      }
      get_user_activity_summary: {
        Args: { p_days?: number; p_user_id: string }
        Returns: {
          activity_category: string
          activity_count: number
          last_activity: string
        }[]
      }
      get_user_role: {
        Args: { user_uuid: string }
        Returns: string
      }
      invalidate_profile_cache: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      is_admin: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      is_host: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      log_property_moderation: {
        Args: {
          p_action: string
          p_metadata?: Json
          p_notes?: string
          p_property_id: string
        }
        Returns: string
      }
      log_user_activity: {
        Args: {
          p_activity_category: string
          p_activity_type: string
          p_description: string
          p_ip_address?: unknown
          p_metadata?: Json
          p_success?: boolean
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      reject_property: {
        Args: { p_notes?: string; p_property_id: string; p_reason: string }
        Returns: boolean
      }
      upsert_analytics_metric: {
        Args: {
          p_date?: string
          p_dimensions?: Json
          p_entity_id?: string
          p_entity_type?: string
          p_metric_name: string
          p_value: number
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
