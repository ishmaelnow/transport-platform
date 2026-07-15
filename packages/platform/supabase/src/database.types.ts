export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      driver_profiles: {
        Row: {
          created_at: string;
          created_by_person_id: string;
          display_name: string;
          driver_number: string;
          driver_profile_id: string;
          email: string | null;
          onboarding_date: string | null;
          person_id: string | null;
          phone: string | null;
          status: string;
          status_reason: string | null;
          tenant_id: string;
          updated_at: string;
          updated_by_person_id: string;
        };
        Insert: {
          created_at?: string;
          created_by_person_id: string;
          display_name: string;
          driver_number: string;
          driver_profile_id?: string;
          email?: string | null;
          onboarding_date?: string | null;
          person_id?: string | null;
          phone?: string | null;
          status?: string;
          status_reason?: string | null;
          tenant_id: string;
          updated_at?: string;
          updated_by_person_id: string;
        };
        Update: {
          created_at?: string;
          created_by_person_id?: string;
          display_name?: string;
          driver_number?: string;
          driver_profile_id?: string;
          email?: string | null;
          onboarding_date?: string | null;
          person_id?: string | null;
          phone?: string | null;
          status?: string;
          status_reason?: string | null;
          tenant_id?: string;
          updated_at?: string;
          updated_by_person_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "driver_profiles_created_by_person_id_fkey";
            columns: ["created_by_person_id"];
            isOneToOne: false;
            referencedRelation: "person_profiles";
            referencedColumns: ["person_id"];
          },
          {
            foreignKeyName: "driver_profiles_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "person_profiles";
            referencedColumns: ["person_id"];
          },
          {
            foreignKeyName: "driver_profiles_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["tenant_id"];
          },
          {
            foreignKeyName: "driver_profiles_updated_by_person_id_fkey";
            columns: ["updated_by_person_id"];
            isOneToOne: false;
            referencedRelation: "person_profiles";
            referencedColumns: ["person_id"];
          },
        ];
      };
      active_tenant_preferences: {
        Row: {
          membership_id: string;
          person_id: string;
          selected_at: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          membership_id: string;
          person_id: string;
          selected_at?: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          membership_id?: string;
          person_id?: string;
          selected_at?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "active_tenant_preferences_membership_id_tenant_id_fkey";
            columns: ["membership_id", "tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenant_memberships";
            referencedColumns: ["membership_id", "tenant_id"];
          },
          {
            foreignKeyName: "active_tenant_preferences_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: true;
            referencedRelation: "person_profiles";
            referencedColumns: ["person_id"];
          },
        ];
      };
      person_profiles: {
        Row: {
          activated_at: string | null;
          anonymized_at: string | null;
          auth_user_id: string | null;
          created_at: string;
          deactivated_at: string | null;
          deleted_at: string | null;
          display_name: string | null;
          locale: string | null;
          normalized_email: string;
          person_id: string;
          primary_email: string;
          status: string;
          suspended_at: string | null;
          time_zone: string | null;
          updated_at: string;
        };
        Insert: {
          activated_at?: string | null;
          anonymized_at?: string | null;
          auth_user_id?: string | null;
          created_at?: string;
          deactivated_at?: string | null;
          deleted_at?: string | null;
          display_name?: string | null;
          locale?: string | null;
          normalized_email: string;
          person_id?: string;
          primary_email: string;
          status?: string;
          suspended_at?: string | null;
          time_zone?: string | null;
          updated_at?: string;
        };
        Update: {
          activated_at?: string | null;
          anonymized_at?: string | null;
          auth_user_id?: string | null;
          created_at?: string;
          deactivated_at?: string | null;
          deleted_at?: string | null;
          display_name?: string | null;
          locale?: string | null;
          normalized_email?: string;
          person_id?: string;
          primary_email?: string;
          status?: string;
          suspended_at?: string | null;
          time_zone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      platform_role_assignments: {
        Row: {
          assigned_at: string | null;
          assigned_by_person_id: string | null;
          assignment_id: string;
          created_at: string;
          expires_at: string | null;
          person_id: string;
          revoked_at: string | null;
          revoked_by_person_id: string | null;
          role_key: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          assigned_at?: string | null;
          assigned_by_person_id?: string | null;
          assignment_id?: string;
          created_at?: string;
          expires_at?: string | null;
          person_id: string;
          revoked_at?: string | null;
          revoked_by_person_id?: string | null;
          role_key: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          assigned_at?: string | null;
          assigned_by_person_id?: string | null;
          assignment_id?: string;
          created_at?: string;
          expires_at?: string | null;
          person_id?: string;
          revoked_at?: string | null;
          revoked_by_person_id?: string | null;
          role_key?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "platform_role_assignments_assigned_by_person_id_fkey";
            columns: ["assigned_by_person_id"];
            isOneToOne: false;
            referencedRelation: "person_profiles";
            referencedColumns: ["person_id"];
          },
          {
            foreignKeyName: "platform_role_assignments_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "person_profiles";
            referencedColumns: ["person_id"];
          },
          {
            foreignKeyName: "platform_role_assignments_revoked_by_person_id_fkey";
            columns: ["revoked_by_person_id"];
            isOneToOne: false;
            referencedRelation: "person_profiles";
            referencedColumns: ["person_id"];
          },
        ];
      };
      tenant_audit_events: {
        Row: {
          actor_person_id: string | null;
          actor_platform_roles: string[];
          actor_type: string;
          audit_event_id: string;
          correlation_id: string;
          created_at: string;
          event_name: string;
          metadata: Json;
          occurred_at: string;
          reason: string;
          resource_id: string;
          resource_type: string;
          tenant_id: string | null;
        };
        Insert: {
          actor_person_id?: string | null;
          actor_platform_roles?: string[];
          actor_type: string;
          audit_event_id?: string;
          correlation_id: string;
          created_at?: string;
          event_name: string;
          metadata?: Json;
          occurred_at?: string;
          reason: string;
          resource_id: string;
          resource_type: string;
          tenant_id?: string | null;
        };
        Update: {
          actor_person_id?: string | null;
          actor_platform_roles?: string[];
          actor_type?: string;
          audit_event_id?: string;
          correlation_id?: string;
          created_at?: string;
          event_name?: string;
          metadata?: Json;
          occurred_at?: string;
          reason?: string;
          resource_id?: string;
          resource_type?: string;
          tenant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_audit_events_actor_person_id_fkey";
            columns: ["actor_person_id"];
            isOneToOne: false;
            referencedRelation: "person_profiles";
            referencedColumns: ["person_id"];
          },
          {
            foreignKeyName: "tenant_audit_events_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["tenant_id"];
          },
        ];
      };
      tenant_capabilities: {
        Row: {
          capability_key: string;
          created_at: string;
          disabled_at: string | null;
          enabled: boolean;
          enabled_at: string | null;
          tenant_id: string;
          updated_at: string;
          updated_by_person_id: string | null;
        };
        Insert: {
          capability_key: string;
          created_at?: string;
          disabled_at?: string | null;
          enabled?: boolean;
          enabled_at?: string | null;
          tenant_id: string;
          updated_at?: string;
          updated_by_person_id?: string | null;
        };
        Update: {
          capability_key?: string;
          created_at?: string;
          disabled_at?: string | null;
          enabled?: boolean;
          enabled_at?: string | null;
          tenant_id?: string;
          updated_at?: string;
          updated_by_person_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_capabilities_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["tenant_id"];
          },
          {
            foreignKeyName: "tenant_capabilities_updated_by_person_id_fkey";
            columns: ["updated_by_person_id"];
            isOneToOne: false;
            referencedRelation: "person_profiles";
            referencedColumns: ["person_id"];
          },
        ];
      };
      tenant_configurations: {
        Row: {
          branding_reference: string | null;
          created_at: string;
          created_by_person_id: string | null;
          default_time_zone: string;
          display_name: string;
          legal_name: string;
          support_contact_email: string;
          tenant_id: string;
          tenant_slug: string | null;
          updated_at: string;
          updated_by_person_id: string | null;
        };
        Insert: {
          branding_reference?: string | null;
          created_at?: string;
          created_by_person_id?: string | null;
          default_time_zone: string;
          display_name: string;
          legal_name: string;
          support_contact_email: string;
          tenant_id: string;
          tenant_slug?: string | null;
          updated_at?: string;
          updated_by_person_id?: string | null;
        };
        Update: {
          branding_reference?: string | null;
          created_at?: string;
          created_by_person_id?: string | null;
          default_time_zone?: string;
          display_name?: string;
          legal_name?: string;
          support_contact_email?: string;
          tenant_id?: string;
          tenant_slug?: string | null;
          updated_at?: string;
          updated_by_person_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_configurations_created_by_person_id_fkey";
            columns: ["created_by_person_id"];
            isOneToOne: false;
            referencedRelation: "person_profiles";
            referencedColumns: ["person_id"];
          },
          {
            foreignKeyName: "tenant_configurations_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: true;
            referencedRelation: "tenants";
            referencedColumns: ["tenant_id"];
          },
          {
            foreignKeyName: "tenant_configurations_updated_by_person_id_fkey";
            columns: ["updated_by_person_id"];
            isOneToOne: false;
            referencedRelation: "person_profiles";
            referencedColumns: ["person_id"];
          },
        ];
      };
      tenant_invitations: {
        Row: {
          accepted_at: string | null;
          accepted_by_person_id: string | null;
          cancelled_at: string | null;
          cancelled_by_person_id: string | null;
          created_at: string;
          email: string;
          email_delivered_at: string | null;
          email_delivery_attempted_at: string | null;
          email_delivery_error: string | null;
          email_delivery_status: string;
          expires_at: string;
          intended_role: string;
          invitation_id: string;
          invitation_token_hash: string;
          invited_by_person_id: string | null;
          normalized_email: string;
          status: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_by_person_id?: string | null;
          cancelled_at?: string | null;
          cancelled_by_person_id?: string | null;
          created_at?: string;
          email: string;
          email_delivered_at?: string | null;
          email_delivery_attempted_at?: string | null;
          email_delivery_error?: string | null;
          email_delivery_status?: string;
          expires_at: string;
          intended_role: string;
          invitation_id?: string;
          invitation_token_hash: string;
          invited_by_person_id?: string | null;
          normalized_email: string;
          status?: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by_person_id?: string | null;
          cancelled_at?: string | null;
          cancelled_by_person_id?: string | null;
          created_at?: string;
          email?: string;
          email_delivered_at?: string | null;
          email_delivery_attempted_at?: string | null;
          email_delivery_error?: string | null;
          email_delivery_status?: string;
          expires_at?: string;
          intended_role?: string;
          invitation_id?: string;
          invitation_token_hash?: string;
          invited_by_person_id?: string | null;
          normalized_email?: string;
          status?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_invitations_accepted_by_person_id_fkey";
            columns: ["accepted_by_person_id"];
            isOneToOne: false;
            referencedRelation: "person_profiles";
            referencedColumns: ["person_id"];
          },
          {
            foreignKeyName: "tenant_invitations_cancelled_by_person_id_fkey";
            columns: ["cancelled_by_person_id"];
            isOneToOne: false;
            referencedRelation: "person_profiles";
            referencedColumns: ["person_id"];
          },
          {
            foreignKeyName: "tenant_invitations_invited_by_person_id_fkey";
            columns: ["invited_by_person_id"];
            isOneToOne: false;
            referencedRelation: "person_profiles";
            referencedColumns: ["person_id"];
          },
          {
            foreignKeyName: "tenant_invitations_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["tenant_id"];
          },
        ];
      };
      tenant_memberships: {
        Row: {
          activated_at: string | null;
          created_at: string;
          created_by_person_id: string | null;
          expires_at: string | null;
          invited_at: string | null;
          membership_id: string;
          person_id: string;
          removed_at: string | null;
          status: string;
          suspended_at: string | null;
          tenant_id: string;
          updated_at: string;
          updated_by_person_id: string | null;
        };
        Insert: {
          activated_at?: string | null;
          created_at?: string;
          created_by_person_id?: string | null;
          expires_at?: string | null;
          invited_at?: string | null;
          membership_id?: string;
          person_id: string;
          removed_at?: string | null;
          status?: string;
          suspended_at?: string | null;
          tenant_id: string;
          updated_at?: string;
          updated_by_person_id?: string | null;
        };
        Update: {
          activated_at?: string | null;
          created_at?: string;
          created_by_person_id?: string | null;
          expires_at?: string | null;
          invited_at?: string | null;
          membership_id?: string;
          person_id?: string;
          removed_at?: string | null;
          status?: string;
          suspended_at?: string | null;
          tenant_id?: string;
          updated_at?: string;
          updated_by_person_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_memberships_created_by_person_id_fkey";
            columns: ["created_by_person_id"];
            isOneToOne: false;
            referencedRelation: "person_profiles";
            referencedColumns: ["person_id"];
          },
          {
            foreignKeyName: "tenant_memberships_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "person_profiles";
            referencedColumns: ["person_id"];
          },
          {
            foreignKeyName: "tenant_memberships_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["tenant_id"];
          },
          {
            foreignKeyName: "tenant_memberships_updated_by_person_id_fkey";
            columns: ["updated_by_person_id"];
            isOneToOne: false;
            referencedRelation: "person_profiles";
            referencedColumns: ["person_id"];
          },
        ];
      };
      tenant_role_assignments: {
        Row: {
          assigned_at: string | null;
          assigned_by_person_id: string | null;
          assignment_id: string;
          created_at: string;
          expires_at: string | null;
          membership_id: string;
          revoked_at: string | null;
          revoked_by_person_id: string | null;
          role_key: string;
          status: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          assigned_at?: string | null;
          assigned_by_person_id?: string | null;
          assignment_id?: string;
          created_at?: string;
          expires_at?: string | null;
          membership_id: string;
          revoked_at?: string | null;
          revoked_by_person_id?: string | null;
          role_key: string;
          status?: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          assigned_at?: string | null;
          assigned_by_person_id?: string | null;
          assignment_id?: string;
          created_at?: string;
          expires_at?: string | null;
          membership_id?: string;
          revoked_at?: string | null;
          revoked_by_person_id?: string | null;
          role_key?: string;
          status?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_role_assignments_assigned_by_person_id_fkey";
            columns: ["assigned_by_person_id"];
            isOneToOne: false;
            referencedRelation: "person_profiles";
            referencedColumns: ["person_id"];
          },
          {
            foreignKeyName: "tenant_role_assignments_membership_id_tenant_id_fkey";
            columns: ["membership_id", "tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenant_memberships";
            referencedColumns: ["membership_id", "tenant_id"];
          },
          {
            foreignKeyName: "tenant_role_assignments_revoked_by_person_id_fkey";
            columns: ["revoked_by_person_id"];
            isOneToOne: false;
            referencedRelation: "person_profiles";
            referencedColumns: ["person_id"];
          },
        ];
      };
      tenants: {
        Row: {
          activated_at: string | null;
          anonymized_at: string | null;
          closed_at: string | null;
          closing_at: string | null;
          created_at: string;
          deleted_at: string | null;
          status: string;
          suspended_at: string | null;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          activated_at?: string | null;
          anonymized_at?: string | null;
          closed_at?: string | null;
          closing_at?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          status?: string;
          suspended_at?: string | null;
          tenant_id?: string;
          updated_at?: string;
        };
        Update: {
          activated_at?: string | null;
          anonymized_at?: string | null;
          closed_at?: string | null;
          closing_at?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          status?: string;
          suspended_at?: string | null;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_tenant_invitation: {
        Args: { token_hash: string };
        Returns: {
          membership_id: string;
          person_id: string;
          status: string;
          tenant_id: string;
        }[];
      };
      can_manage_tenant_memberships: {
        Args: { target_tenant_id: string };
        Returns: boolean;
      };
      can_manage_tenant_roles: {
        Args: { target_tenant_id: string };
        Returns: boolean;
      };
      can_read_tenant_audit: {
        Args: { target_tenant_id: string };
        Returns: boolean;
      };
      close_provisioning_tenant: {
        Args: {
          correlation_id: string;
          reason: string;
          target_tenant_id: string;
        };
        Returns: {
          closed_status: string;
          closed_tenant_id: string;
        }[];
      };
      current_person_id: { Args: never; Returns: string };
      current_person_is_active: { Args: never; Returns: boolean };
      current_person_normalized_email: { Args: never; Returns: string };
      has_active_platform_role: {
        Args: { required_roles: string[] };
        Returns: boolean;
      };
      has_active_tenant_membership: {
        Args: { target_tenant_id: string };
        Returns: boolean;
      };
      has_tenant_role: {
        Args: { required_roles: string[]; target_tenant_id: string };
        Returns: boolean;
      };
      inspect_tenant_invitation_token: {
        Args: { token_hash: string };
        Returns: {
          intended_role: string;
          invitation_email: string;
          status: string;
          tenant_display_name: string;
        }[];
      };
      is_platform_data_admin: { Args: never; Returns: boolean };
      provision_tenant_with_owner_invitation: {
        Args: {
          correlation_id: string;
          invitation_token_hash: string;
          owner_email: string;
          reason: string;
          tenant_branding_reference: string;
          tenant_default_time_zone: string;
          tenant_display_name: string;
          tenant_legal_name: string;
          tenant_support_contact_email: string;
        };
        Returns: {
          invitation_id: string;
          tenant_id: string;
        }[];
      };
      provision_tenant_with_owner_invitation_v2: {
        Args: {
          correlation_id: string;
          invitation_token_hash: string;
          owner_email: string;
          reason: string;
          tenant_branding_reference: string;
          tenant_default_time_zone: string;
          tenant_display_name: string;
          tenant_legal_name: string;
          tenant_slug: string;
          tenant_support_contact_email: string;
        };
        Returns: {
          provisioned_invitation_id: string;
          provisioned_tenant_id: string;
        }[];
      };
      tenant_capability_enabled: {
        Args: { required_capability: string; target_tenant_id: string };
        Returns: boolean;
      };
      tenant_has_active_owner: {
        Args: { target_tenant_id: string };
        Returns: boolean;
      };
      tenant_member_directory: {
        Args: { target_tenant_id: string };
        Returns: {
          display_name: string;
          membership_id: string;
          membership_status: string;
          person_id: string;
          person_status: string;
          primary_email: string;
          tenant_id: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
