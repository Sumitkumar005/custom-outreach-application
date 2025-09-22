import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getSettings } from "@/lib/settings"
import { getBatch, updateBatchStats } from "@/lib/batch"
import { generateEmail, sendEmail } from "@/lib/email"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: NextRequest) {
  try {
    const isAuthenticated = await getSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { batchId, generatedEmails } = await request.json()

    if (!batchId) {
      return NextResponse.json({ error: "Batch ID is required" }, { status: 400 })
    }

    // Get user identifier (using email as user_id for simplicity)
    const userId = "user@example.com" // TODO: Get actual user ID from session

    // Get batch data
    const batch = await getBatch(batchId, userId)
    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 })
    }

    // Get settings
    const settings = await getSettings()
    if (!settings) {
      return NextResponse.json({ error: "Settings not configured" }, { status: 400 })
    }

    let delivered = 0
    const errors: string[] = []

    // Process each generated email
    for (let i = 0; i < generatedEmails.length; i++) {
      const emailData = generatedEmails[i]

      try {
        // Use the configured email credentials
        const emailToUse = settings.email
        const passwordToUse = settings.appPassword

        // Send email
        const success = await sendEmail({
          to: emailData.email,
          subject: emailData.subject,
          htmlContent: emailData.htmlContent,
          textContent: emailData.textContent,
          smtpEmail: emailToUse,
          smtpPassword: passwordToUse,
          trackingId: emailData.trackingId,
          batchId,
          contactName: emailData.contactName,
          trackingBaseUrl: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
          cc: emailData.cc, // Pass CC recipients from frontend if any
        })

        if (success) {
          delivered++
        } else {
          errors.push(`Failed to send email to ${emailData.email}`)
        }

        // Rate limiting: 1 email per second
        if (i < generatedEmails.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      } catch (error) {
        errors.push(`Error sending to ${emailData.email}: ${(error as Error).message}`)
      }
    }

    // Update batch statistics
    await updateBatchStats(batchId, delivered, 0, userId) // opened will be updated by tracking

    return NextResponse.json({
      success: true,
      delivered,
      total: generatedEmails.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully sent ${delivered} out of ${generatedEmails.length} emails`,
    })
  } catch (error) {
    console.error("Email sending error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
