import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getBatch } from "@/lib/batch"
import { getBatchTracking } from "@/lib/email"

export async function GET(request: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    const isAuthenticated = await getSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { batchId } = await params

    // Get user identifier (using email as user_id for simplicity)
    const userId = "user@example.com" // TODO: Get actual user ID from session

    // Get batch data
    const batch = await getBatch(batchId, userId)
    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 })
    }

    // Get tracking data
    const tracking = await getBatchTracking(batchId)

    // Create detailed contact information
    const contactDetails = batch.contacts.map((contact) => {
      const trackingRecord = tracking.find((t) => t.email === contact.mail)

      return {
        name: contact.name,
        email: contact.mail,
        university: contact.university,
        designation: contact.designation,
        country: contact.country,
        statesCity: contact["states/city"],
        delivered: !!trackingRecord,
        opened: !!trackingRecord?.openedAt,
        openCount: trackingRecord?.openCount || 0,
        sentAt: trackingRecord?.sentAt,
        openedAt: trackingRecord?.openedAt,
      }
    })

    return NextResponse.json({
      batch: {
        id: batch.id,
        uploadTime: batch.uploadTime,
        csvName: batch.csvName,
        totalEmails: batch.totalEmails,
        delivered: batch.delivered,
        opened: batch.opened,
        openRate: batch.openRate,
      },
      contacts: contactDetails,
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
