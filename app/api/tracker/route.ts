import { type NextRequest, NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"

const TRACKING_FILE = path.join(process.cwd(), "data", "tracking.json")
const BATCHES_FILE = path.join(process.cwd(), "data", "batches.json")

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const trackingId = url.searchParams.get('id')

  // Log the request details
  console.log('Email opened at:', new Date().toISOString())
  console.log('IP Address:', request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown')
  console.log('User-Agent:', request.headers.get('user-agent'))
  console.log('Tracking ID:', trackingId)

  try {
    // Update tracking data if ID provided
    if (trackingId) {
      await updateTrackingData(trackingId, request)
    }

    // Respond with the tracking pixel
    const imagePath = path.join(process.cwd(), "public", "track_open.png")
    const imageBuffer = await fs.readFile(imagePath)

    return new NextResponse(new Uint8Array(imageBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    })
  } catch (error) {
    console.error("Tracker error:", error)

    // Return a simple 1x1 transparent pixel on error
    const pixelData = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "base64"
    )
    return new NextResponse(new Uint8Array(pixelData), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    })
  }
}

async function updateTrackingData(trackingId: string, request: NextRequest) {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(TRACKING_FILE)
    await fs.mkdir(dataDir, { recursive: true })

    // Load tracking data
    let tracking = []
    try {
      const data = await fs.readFile(TRACKING_FILE, "utf-8")
      tracking = JSON.parse(data)
    } catch {
      console.log("No tracking file found, will create new one")
    }

    // Find and update the record
    const recordIndex = tracking.findIndex((record: any) => record.id === trackingId)
    if (recordIndex !== -1) {
      const record = tracking[recordIndex]

      // Increment open count
      record.openCount = (record.openCount || 0) + 1

      // Set opened timestamp if not set
      if (!record.openedAt) {
        record.openedAt = new Date().toISOString()
      }

      // Add open event
      if (!record.openEvents) {
        record.openEvents = []
      }

      record.openEvents.push({
        timestamp: new Date().toISOString(),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      })

      console.log(`Updated tracking for ${record.email}: ${record.openCount} opens`)

      // Save tracking data
      await fs.writeFile(TRACKING_FILE, JSON.stringify(tracking, null, 2))

      // Update batch statistics
      await updateBatchStats(record.batchId)
    } else {
      console.log(`Tracking record not found for ID: ${trackingId}`)
    }
  } catch (error) {
    console.error("Error updating tracking data:", error)
  }
}

async function updateBatchStats(batchId: string) {
  try {
    // Load batches data
    let batches = []
    try {
      const data = await fs.readFile(BATCHES_FILE, "utf-8")
      batches = JSON.parse(data)
    } catch {
      console.log("No batches file found")
      return
    }

    // Load tracking data
    let tracking = []
    try {
      const data = await fs.readFile(TRACKING_FILE, "utf-8")
      tracking = JSON.parse(data)
    } catch {
      console.log("No tracking file found")
      return
    }

    // Find batch
    const batchIndex = batches.findIndex((batch: any) => batch.id === batchId)
    if (batchIndex !== -1) {
      const batch = batches[batchIndex]

      // Count opens for this batch
      const batchTracking = tracking.filter((record: any) => record.batchId === batchId)
      const totalOpens = batchTracking.reduce((sum: number, record: any) => sum + (record.openCount || 0), 0)
      const uniqueOpens = batchTracking.filter((record: any) => record.openCount > 0).length

      // Update batch stats
      batch.opened = uniqueOpens
      batch.openRate = batch.delivered > 0 ? (uniqueOpens / batch.delivered) * 100 : 0

      console.log(`Updated batch ${batchId}: ${uniqueOpens} opens, ${batch.openRate.toFixed(1)}% rate`)

      // Save batches data
      await fs.writeFile(BATCHES_FILE, JSON.stringify(batches, null, 2))
    }
  } catch (error) {
    console.error("Error updating batch stats:", error)
  }
}
