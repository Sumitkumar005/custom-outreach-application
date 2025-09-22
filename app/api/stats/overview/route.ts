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

    // Fetch batches from Supabase for this user
    const { data: batches, error } = await supabase
      .from('batches')
      .select('upload_time, total_emails, delivered, opened')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching batches:', error)
      throw error
    }

    // Calculate overall statistics
    const totalSent = batches.reduce((sum, batch) => sum + batch.total_emails, 0)
    const totalDelivered = batches.reduce((sum, batch) => sum + batch.delivered, 0)
    const totalOpened = batches.reduce((sum, batch) => sum + batch.opened, 0)
    const averageOpenRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0

    // Calculate recent activity (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentBatches = batches.filter((batch) => new Date(batch.upload_time) >= thirtyDaysAgo)

    const recentSent = recentBatches.reduce((sum, batch) => sum + batch.total_emails, 0)
    const recentDelivered = recentBatches.reduce((sum, batch) => sum + batch.delivered, 0)
    const recentOpened = recentBatches.reduce((sum, batch) => sum + batch.opened, 0)

    // Calculate delivery rate
    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0

    return NextResponse.json({
      overview: {
        totalSent,
        totalDelivered,
        totalOpened,
        averageOpenRate: Math.round(averageOpenRate * 10) / 10,
        deliveryRate: Math.round(deliveryRate * 10) / 10,
        totalBatches: batches.length,
        recentActivity: {
          sent: recentSent,
          delivered: recentDelivered,
          opened: recentOpened,
          batches: recentBatches.length,
        },
      },
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
