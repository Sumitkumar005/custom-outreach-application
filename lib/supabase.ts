import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database types
export interface Batch {
  id: string
  upload_time: string
  csv_name: string
  total_emails: number
  delivered: number
  opened: number
  clicked: number
  open_rate: number
  click_rate: number
  contacts: Contact[]
}

export interface Contact {
  id: string
  name: string
  email: string
  sent_at?: string
  opened_at?: string
  clicked_at?: string
  open_count: number
  click_count: number
}

export interface TrackingEvent {
  id: string
  tracking_id: string
  event_type: 'open' | 'click' | 'bounce'
  ip_address?: string
  user_agent?: string
  country?: string
  region?: string
  city?: string
  device_type?: string
  browser?: string
  platform?: string
  url?: string
  timestamp: string
  is_genuine: boolean
}

export interface Settings {
  id: string
  openai_api_key: string
  email: string
  app_password: string
  cc_recipients?: string
  created_at: string
  updated_at: string
}
