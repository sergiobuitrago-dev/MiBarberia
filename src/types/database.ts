
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "barbers": {
                  Row: {
                    "barbershop_id": string,"commission_rate": number,"created_at": string,"id": string,"is_active": boolean,"name": string,"updated_at": string
                  }
                  Insert: {
                    "barbershop_id": string,"commission_rate": number,"created_at"?: string,"id"?: string,"is_active"?: boolean,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "barbershop_id"?: string,"commission_rate"?: number,"created_at"?: string,"id"?: string,"is_active"?: boolean,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "barbers_barbershop_id_fkey"
      columns: ["barbershop_id"]
isOneToOne: false
      referencedRelation: "barbershops"
      referencedColumns: ["id"]
    }
                  ]
                },"barbershop_users": {
                  Row: {
                    "barbershop_id": string,"created_at": string,"id": string,"role": string,"user_id": string
                  }
                  Insert: {
                    "barbershop_id": string,"created_at"?: string,"id"?: string,"role": string,"user_id": string
                  }
                  Update: {
                    "barbershop_id"?: string,"created_at"?: string,"id"?: string,"role"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "barbershop_users_barbershop_id_fkey"
      columns: ["barbershop_id"]
isOneToOne: false
      referencedRelation: "barbershops"
      referencedColumns: ["id"]
    }
                  ]
                },"barbershops": {
                  Row: {
                    "created_at": string,"currency_code": string,"google_review_url": string | null,"id": string,"name": string,"timezone": string
                  }
                  Insert: {
                    "created_at"?: string,"currency_code"?: string,"google_review_url"?: string | null,"id"?: string,"name": string,"timezone"?: string
                  }
                  Update: {
                    "created_at"?: string,"currency_code"?: string,"google_review_url"?: string | null,"id"?: string,"name"?: string,"timezone"?: string
                  }
                  Relationships: [
                    
                  ]
                },"customers": {
                  Row: {
                    "barbershop_id": string,"created_at": string,"id": string,"name": string,"phone": string | null,"updated_at": string
                  }
                  Insert: {
                    "barbershop_id": string,"created_at"?: string,"id"?: string,"name": string,"phone"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "barbershop_id"?: string,"created_at"?: string,"id"?: string,"name"?: string,"phone"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "customers_barbershop_id_fkey"
      columns: ["barbershop_id"]
isOneToOne: false
      referencedRelation: "barbershops"
      referencedColumns: ["id"]
    }
                  ]
                },"loyalty_programs": {
                  Row: {
                    "barbershop_id": string,"created_at": string,"id": string,"is_active": boolean,"required_visits": number,"reward_description": string,"updated_at": string
                  }
                  Insert: {
                    "barbershop_id": string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"required_visits": number,"reward_description": string,"updated_at"?: string
                  }
                  Update: {
                    "barbershop_id"?: string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"required_visits"?: number,"reward_description"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "loyalty_programs_barbershop_id_fkey"
      columns: ["barbershop_id"]
isOneToOne: true
      referencedRelation: "barbershops"
      referencedColumns: ["id"]
    }
                  ]
                },"services": {
                  Row: {
                    "barbershop_id": string,"base_price": number,"created_at": string,"id": string,"is_active": boolean,"name": string,"updated_at": string
                  }
                  Insert: {
                    "barbershop_id": string,"base_price": number,"created_at"?: string,"id"?: string,"is_active"?: boolean,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "barbershop_id"?: string,"base_price"?: number,"created_at"?: string,"id"?: string,"is_active"?: boolean,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "services_barbershop_id_fkey"
      columns: ["barbershop_id"]
isOneToOne: false
      referencedRelation: "barbershops"
      referencedColumns: ["id"]
    }
                  ]
                },"visit_items": {
                  Row: {
                    "barbershop_id": string,"catalog_price": number,"charged_price": number,"created_at": string,"id": string,"service_id": string,"service_name": string,"visit_id": string
                  }
                  Insert: {
                    "barbershop_id": string,"catalog_price": number,"charged_price": number,"created_at"?: string,"id"?: string,"service_id": string,"service_name": string,"visit_id": string
                  }
                  Update: {
                    "barbershop_id"?: string,"catalog_price"?: number,"charged_price"?: number,"created_at"?: string,"id"?: string,"service_id"?: string,"service_name"?: string,"visit_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "visit_items_barbershop_id_fkey"
      columns: ["barbershop_id"]
isOneToOne: false
      referencedRelation: "barbershops"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "visit_items_barbershop_id_service_id_fkey"
      columns: ["barbershop_id","service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["barbershop_id","id"]
    },{
      foreignKeyName: "visit_items_barbershop_id_visit_id_fkey"
      columns: ["barbershop_id","visit_id"]
isOneToOne: false
      referencedRelation: "visits"
      referencedColumns: ["barbershop_id","id"]
    }
                  ]
                },"visits": {
                  Row: {
                    "barber_id": string,"barbershop_id": string,"commission_amount": number,"commission_rate": number,"created_at": string,"customer_id": string | null,"discount_amount": number,"id": string,"notes": string | null,"payment_method": string,"status": string,"subtotal_amount": number,"total_amount": number,"updated_at": string,"visited_at": string,"voided_at": string | null
                  }
                  Insert: {
                    "barber_id": string,"barbershop_id": string,"commission_amount": number,"commission_rate": number,"created_at"?: string,"customer_id"?: string | null,"discount_amount"?: number,"id"?: string,"notes"?: string | null,"payment_method": string,"status"?: string,"subtotal_amount": number,"total_amount": number,"updated_at"?: string,"visited_at"?: string,"voided_at"?: string | null
                  }
                  Update: {
                    "barber_id"?: string,"barbershop_id"?: string,"commission_amount"?: number,"commission_rate"?: number,"created_at"?: string,"customer_id"?: string | null,"discount_amount"?: number,"id"?: string,"notes"?: string | null,"payment_method"?: string,"status"?: string,"subtotal_amount"?: number,"total_amount"?: number,"updated_at"?: string,"visited_at"?: string,"voided_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "visits_barbershop_id_barber_id_fkey"
      columns: ["barbershop_id","barber_id"]
isOneToOne: false
      referencedRelation: "barbers"
      referencedColumns: ["barbershop_id","id"]
    },{
      foreignKeyName: "visits_barbershop_id_customer_id_fkey"
      columns: ["barbershop_id","customer_id"]
isOneToOne: false
      referencedRelation: "customer_activity"
      referencedColumns: ["barbershop_id","id"]
    },{
      foreignKeyName: "visits_barbershop_id_customer_id_fkey"
      columns: ["barbershop_id","customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["barbershop_id","id"]
    },{
      foreignKeyName: "visits_barbershop_id_fkey"
      columns: ["barbershop_id"]
isOneToOne: false
      referencedRelation: "barbershops"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "customer_activity": {
                  Row: {
                    "barbershop_id": string | null,"id": string | null,"last_visit": string | null,"name": string | null,"phone": string | null,"total_spent": string | null,"total_visits": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "customers_barbershop_id_fkey"
      columns: ["barbershop_id"]
isOneToOne: false
      referencedRelation: "barbershops"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "create_visit":
{ Args: { "p_barber_id": string,"p_customer_id"?: string,"p_discount_amount": number,"p_items": Json,"p_new_customer"?: Json,"p_payment_method": string }; Returns: string
                           },
"get_dashboard":
{ Args: { "p_end_date"?: string,"p_period"?: string,"p_start_date"?: string }; Returns: Json
                           },
"search_customers":
{ Args: { "p_page"?: number,"p_query"?: string }; Returns: Json
                           },
"void_visit":
{ Args: { "p_visit_id": string }; Returns: string
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const

