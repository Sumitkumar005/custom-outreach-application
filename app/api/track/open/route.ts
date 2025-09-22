import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import fs from "fs/promises"
import path from "path"

// Get client IP address from request
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  if (cfConnectingIp) {
    return cfConnectingIp
  }

  // For local development/testing
  return '127.0.0.1'
}

// Check if the open is genuine (not from bots, prefetchers, etc.)
function isGenuineOpen(userAgent: string | null, ipAddress: string): boolean {
  if (!userAgent) return false;

  const ua = userAgent.toLowerCase();

  // Known bot/prefetcher user agents to filter out
  const botPatterns = [
    'googleimageproxy',
    'cloudmark',
    'symantec',
    'mimecast',
    'proofpoint',
    'barracuda',
    'spam',
    'filter',
    'crawler',
    'bot',
    'spider',
    'preview',
    'monitoring',
    'validator',
    'checker',
    'scanner',
    'monitor',
    'prefetch',
    'preload'
  ];

  // Check for bot patterns
  for (const pattern of botPatterns) {
    if (ua.includes(pattern)) {
      return false;
    }
  }

  // Gmail image proxy detection
  if (ua.includes('googleimageproxy')) {
    return false;
  }

  // Check for local/internal IPs that might be testing
  if (ipAddress === '127.0.0.1' ||
      ipAddress.startsWith('192.168.') ||
      ipAddress.startsWith('10.') ||
      ipAddress.startsWith('172.16.') ||
      ipAddress === '::1') {
    return false;
  }

  return true;
}

// Update batch open statistics
async function updateBatchOpenStats(batchId: string, userId: string): Promise<void> {
  try {
    // Get tracking events for this batch
    const { data: trackingEvents, error } = await supabase
      .from('tracking_events')
      .select('email, event_type')
      .eq('batch_id', batchId)
      .eq('event_type', 'open')
      .eq('user_id', userId)

    if (error) {
      console.error("Error fetching tracking events:", error)
      return
    }

    // Count unique opens for this batch
    const uniqueOpens = new Set(trackingEvents?.map(event => event.email)).size
    const totalDelivered = trackingEvents?.length || 0

    // Update batch record
    const openRate = totalDelivered > 0 ? (uniqueOpens / totalDelivered) * 100 : 0

    const { error: updateError } = await supabase
      .from('batches')
      .update({
        opened: uniqueOpens,
        open_rate: openRate
      })
      .eq('id', batchId)
      .eq('user_id', userId)

    if (updateError) {
      console.error("Failed to update batch open stats:", updateError)
    }
  } catch (error) {
    console.error("Failed to update batch open stats:", error)
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const trackingId = url.searchParams.get('id')

  if (!trackingId) {
    // Return the tracking image without tracking if no ID provided
    const imagePath = path.join(process.cwd(), "public", "track_open.png")
    try {
      const imageBuffer = await fs.readFile(imagePath)
      return new NextResponse(new Uint8Array(imageBuffer), {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      })
    } catch {
      // Return a simple 1x1 transparent pixel if image not found
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

  const timestamp = new Date().toISOString()
  const ipAddress = getClientIP(request)
  const userAgent = request.headers.get('user-agent')
  const isGenuine = isGenuineOpen(userAgent, ipAddress)

  console.log(`Email open tracking - ID: ${trackingId}, IP: ${ipAddress}, Genuine: ${isGenuine}`)

  try {
    // Find tracking record in Supabase
    const { data: trackingRecord, error } = await supabase
      .from('tracking_events')
      .select('batch_id, email, contact_name')
      .eq('id', trackingId)
      .eq('user_id', "user@example.com")
      .single()

    if (error || !trackingRecord) {
      console.log(`Tracking record not found for ID: ${trackingId}`)
      // Return image anyway
      const imagePath = path.join(process.cwd(), "public", "track_open.png")
      try {
        const imageBuffer = await fs.readFile(imagePath)
        return new NextResponse(new Uint8Array(imageBuffer), {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        })
      } catch {
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

    // Only count genuine opens
    if (isGenuine) {
      // Insert open event into tracking_events table
      const { error: insertError } = await supabase
        .from('tracking_events')
        .insert({
          id: trackingId,
          batch_id: trackingRecord.batch_id,
          email: trackingRecord.email,
          contact_name: trackingRecord.contact_name,
          event_type: 'open',
          timestamp: timestamp,
          ip_address: ipAddress,
          user_agent: userAgent,
          is_genuine: isGenuine,
          user_id: "user@example.com"
        })

      if (insertError) {
        console.error("Error inserting tracking event:", insertError)
      } else {
        console.log(`Genuine email open tracked - ${trackingRecord.email}`)
        // Update batch statistics
        await updateBatchOpenStats(trackingRecord.batch_id, "user@example.com")
      }
    } else {
      console.log(`Bot/prefetch open detected - ${trackingRecord.email}`)
    }

    // Return the tracking image
    const imagePath = path.join(process.cwd(), "public", "track_open.png")
    try {
      const imageBuffer = await fs.readFile(imagePath)
      return new NextResponse(new Uint8Array(imageBuffer), {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      })
    } catch {
      // Return a simple 1x1 transparent pixel if image not found
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
  } catch (error) {
    console.error("Tracking error:", error)

    // Always return image even on error
    const imagePath = path.join(process.cwd(), "public", "track_open.png")
    try {
      const imageBuffer = await fs.readFile(imagePath)
      return new NextResponse(new Uint8Array(imageBuffer), {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      })
    } catch {
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
}
