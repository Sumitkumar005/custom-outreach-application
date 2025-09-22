import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    const isAuthenticated = await getSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user identifier (using email as user_id for simplicity)
    const userId = "user@example.com" // TODO: Get actual user ID from session

    const { data: batches, error } = await supabase
      .from('batches')
      .select('id, upload_time, csv_name, total_emails, delivered, opened, open_rate, contacts')
      .eq('user_id', userId)
      .order('upload_time', { ascending: false })

    if (error) {
      console.error('Supabase fetch batches error:', error)
      return NextResponse.json({ batches: [] })
    }

    // Remove contacts details for privacy
    const sanitizedBatches = batches.map(({ contacts, upload_time, csv_name, total_emails, delivered, opened, open_rate, id }) => ({
      id,
      uploadTime: upload_time,
      csvName: csv_name,
      totalEmails: total_emails,
      delivered,
      opened,
      openRate: open_rate,
    }))

    return NextResponse.json({ batches: sanitizedBatches })
  } catch (error) {
    console.error('Batch history GET error:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const isAuthenticated = await getSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { batchIds }: { batchIds: string[] } = await request.json()

    if (!batchIds || !Array.isArray(batchIds) || batchIds.length === 0) {
      return NextResponse.json({ error: "Invalid batch IDs" }, { status: 400 })
    }

    // Delete batches and related contacts and tracking events in Supabase
    const { error: deleteTrackingError } = await supabase
      .from('tracking_events')
      .delete()
      .in('tracking_id', batchIds)

    if (deleteTrackingError) {
      console.error('Error deleting tracking events:', deleteTrackingError)
      return NextResponse.json({ error: "Failed to delete tracking events" }, { status: 500 })
    }

    const { error: deleteContactsError } = await supabase
      .from('contacts')
      .delete()
      .in('batch_id', batchIds)

    if (deleteContactsError) {
      console.error('Error deleting contacts:', deleteContactsError)
      return NextResponse.json({ error: "Failed to delete contacts" }, { status: 500 })
    }

    const { error: deleteBatchesError } = await supabase
      .from('batches')
      .delete()
      .in('id', batchIds)

    if (deleteBatchesError) {
      console.error('Error deleting batches:', deleteBatchesError)
      return NextResponse.json({ error: "Failed to delete batches" }, { status: 500 })
    }

    return NextResponse.json({
      message: `Successfully deleted ${batchIds.length} batch(es)`,
      deletedCount: batchIds.length
    })
  } catch (error) {
    console.error("Error deleting batches:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
