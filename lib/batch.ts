import { supabase } from "./supabase"

export interface Contact {
  country: string
  "states/city": string
  name: string
  designation: string
  mail: string
  university: string
  // Product context fields
  product_name?: string
  cta_goal?: string
  product_oneliner?: string
  product_core_users?: string
  product_features_bulleted?: string
  product_outcomes_metrics?: string
  product_caselets?: string
  // Recipient context fields
  recipient_public_notes?: string
  recipient_business_map?: string
  recipient_icp_geos?: string
  recipient_offers?: string
  relevant_trigger?: string
  recipient_pain?: string
  lead_source?: string
  prospect_persona?: string
}

export interface BatchRecord {
  id: string
  uploadTime: string
  csvName: string
  totalEmails: number
  delivered: number
  opened: number
  openRate: number
  contacts: Contact[]
}

export async function getBatch(batchId: string, userId?: string): Promise<BatchRecord | null> {
  try {
    let query = supabase
      .from('batches')
      .select('*')
      .eq('id', batchId)

    // If userId is provided, filter by user
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query.single()

    if (error || !data) {
      return null
    }

    return {
      id: data.id,
      uploadTime: data.upload_time,
      csvName: data.csv_name,
      totalEmails: data.total_emails,
      delivered: data.delivered,
      opened: data.opened,
      openRate: data.open_rate,
      contacts: data.contacts || []
    }
  } catch {
    return null
  }
}

export async function updateBatchStats(batchId: string, delivered: number, opened: number, userId?: string): Promise<void> {
  try {
    const openRate = delivered > 0 ? (opened / delivered) * 100 : 0

    let query = supabase
      .from('batches')
      .update({
        delivered,
        opened,
        open_rate: openRate
      })
      .eq('id', batchId)

    // If userId is provided, filter by user
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { error } = await query

    if (error) {
      console.error("Failed to update batch stats:", error)
    }
  } catch (error) {
    console.error("Failed to update batch stats:", error)
  }
}
