import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import fs from "fs/promises"
import path from "path"

const TRACKING_FILE = path.join(process.cwd(), "data", "tracking.json")
const BATCHES_FILE = path.join(process.cwd(), "data", "batches.json")

interface TrackingRecord {
  id: string
  batchId: string
  sentAt: string
  openedAt?: string
  openCount: number
  email: string
  openEvents?: any[]
}

interface BatchRecord {
  id: string
  uploadTime: string
  csvName: string
  totalEmails: number
  delivered: number
  opened: number
  openRate: number
  contacts: any[]
}

export async function GET(request: NextRequest) {
  try {
    const isAuthenticated = await getSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Set up Server-Sent Events with polling
    const responseStream = new ReadableStream({
      start(controller) {
        let lastModified = new Date(0)

        // Send initial data
        sendData(controller, 'initial')

        // Poll for updates every 2 seconds
        const interval = setInterval(async () => {
          try {
            const stats = await fs.stat(TRACKING_FILE)
            if (stats.mtime > lastModified) {
              lastModified = stats.mtime
              await sendData(controller, 'update')
            }
          } catch (error) {
            // File might not exist yet, continue polling
          }
        }, 2000)

        // Cleanup on connection close
        request.signal.addEventListener('abort', () => {
          clearInterval(interval)
          controller.close()
        })
      }
    })

    return new NextResponse(responseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    })
  } catch (error) {
    console.error("Error setting up SSE:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function sendData(controller: ReadableStreamDefaultController, type: 'initial' | 'update') {
  try {
    // Read current data
    const [trackingData, batchesData] = await Promise.all([
      fs.readFile(TRACKING_FILE, 'utf-8').catch(() => '[]'),
      fs.readFile(BATCHES_FILE, 'utf-8').catch(() => '[]')
    ])

    const tracking: TrackingRecord[] = JSON.parse(trackingData)
    const batches: BatchRecord[] = JSON.parse(batchesData)

    // Calculate current batch stats
    const updatedBatches = batches.map(batch => {
      const batchTracking = tracking.filter(t => t.batchId === batch.id)
      const opened = batchTracking.filter(t => t.openCount > 0).length
      const openRate = batch.totalEmails > 0 ? (opened / batch.totalEmails) * 100 : 0

      return {
        ...batch,
        opened,
        openRate
      }
    })

    const eventData = {
      type,
      timestamp: new Date().toISOString(),
      batches: updatedBatches.map(({ contacts, ...batch }) => batch),
      tracking: tracking
    }

    controller.enqueue(`data: ${JSON.stringify(eventData)}\n\n`)
  } catch (error) {
    console.error('Error sending data:', error)
  }
}
