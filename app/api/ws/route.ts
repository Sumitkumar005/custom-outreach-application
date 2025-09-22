import { type NextRequest, NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"

const TRACKING_FILE = path.join(process.cwd(), "data", "tracking.json")
const BATCHES_FILE = path.join(process.cwd(), "data", "batches.json")

// Store last modification times
let lastTrackingModTime = 0
let lastBatchesModTime = 0

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const action = url.searchParams.get('action')

  try {
    if (action === 'poll') {
      // Check for updates
      const trackingFile = path.join(process.cwd(), 'data', 'tracking.json')
      const batchesFile = path.join(process.cwd(), 'data', 'batches.json')

      let trackingChanged = false
      let batchesChanged = false

      try {
        const trackingStats = await fs.stat(trackingFile)
        if (trackingStats.mtime.getTime() > lastTrackingModTime) {
          lastTrackingModTime = trackingStats.mtime.getTime()
          trackingChanged = true
        }
      } catch {
        // File doesn't exist
      }

      try {
        const batchesStats = await fs.stat(batchesFile)
        if (batchesStats.mtime.getTime() > lastBatchesModTime) {
          lastBatchesModTime = batchesStats.mtime.getTime()
          batchesChanged = true
        }
      } catch {
        // File doesn't exist
      }

      if (trackingChanged || batchesChanged) {
        // Return updated data
        let tracking = []
        let batches = []

        try {
          const trackingData = await fs.readFile(trackingFile, 'utf-8')
          tracking = JSON.parse(trackingData)
        } catch {
          // No tracking file
        }

        try {
          const batchesData = await fs.readFile(batchesFile, 'utf-8')
          batches = JSON.parse(batchesData)
        } catch {
          // No batches file
        }

        return NextResponse.json({
          updated: true,
          tracking,
          batches,
          timestamp: new Date().toISOString()
        })
      } else {
        return NextResponse.json({
          updated: false,
          timestamp: new Date().toISOString()
        })
      }
    }

    // Default response
    return NextResponse.json({
      message: 'WebSocket alternative polling endpoint',
      usage: '/api/ws?action=poll'
    })

  } catch (error) {
    console.error('WS polling error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
