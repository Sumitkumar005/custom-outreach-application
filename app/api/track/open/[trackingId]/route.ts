import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

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

// Parse user agent string to get device and browser info
function parseUserAgent(userAgent: string | null): { deviceType: string; browser: string; platform: string } {
  if (!userAgent) {
    return { deviceType: 'unknown', browser: 'unknown', platform: 'unknown' }
  }

  const ua = userAgent.toLowerCase()
  let deviceType = 'desktop'
  let browser = 'unknown'
  let platform = 'unknown'

  // Device detection
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    deviceType = 'mobile'
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    deviceType = 'tablet'
  }

  // Browser detection
  if (ua.includes('chrome') && !ua.includes('edg')) {
    browser = 'chrome'
  } else if (ua.includes('firefox')) {
    browser = 'firefox'
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = 'safari'
  } else if (ua.includes('edg')) {
    browser = 'edge'
  } else if (ua.includes('opera')) {
    browser = 'opera'
  }

  // Platform detection
  if (ua.includes('windows')) {
    platform = 'windows'
  } else if (ua.includes('mac')) {
    platform = 'mac'
  } else if (ua.includes('linux')) {
    platform = 'linux'
  } else if (ua.includes('android')) {
    platform = 'android'
  } else if (ua.includes('iphone') || ua.includes('ipad')) {
    platform = 'ios'
  }

  return { deviceType, browser, platform }
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

// Get approximate location from IP (enhanced implementation)
async function getLocationFromIP(ip: string): Promise<{ country?: string; region?: string; city?: string }> {
  if (ip === 'unknown' || ip === '127.0.0.1' || 
      ip.startsWith('192.168.') || ip.startsWith('10.') || 
      ip.startsWith('172.16.') || ip === '::1') {
    return { country: 'local', region: 'local', city: 'local' }
  }

  try {
    // You can integrate with free IP geolocation services like:
    // - ipapi.co (free tier: 1000 requests/day)
    // - ipinfo.io (free tier: 50,000 requests/month)
    // - geojs.io (free)
    
    // Example with ipapi.co (uncomment to use):
    /*
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { 'User-Agent': 'Foreign-Admits-Email-Tracker/1.0' },
      timeout: 3000
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        country: data.country_name || 'unknown',
        region: data.region || 'unknown',
        city: data.city || 'unknown'
      };
    }
    */

    // Simple fallback based on IP ranges (for demo purposes)
    if (ip.includes('.') && !ip.includes(':')) {
      // IPv4 - simple country guess based on first octet
      const firstOctet = parseInt(ip.split('.')[0])
      if (firstOctet >= 1 && firstOctet <= 126) return { country: 'US', region: 'North America', city: 'Unknown' }
      if (firstOctet >= 127 && firstOctet <= 191) return { country: 'EU', region: 'Europe', city: 'Unknown' }
      if (firstOctet >= 192 && firstOctet <= 223) return { country: 'AS', region: 'Asia', city: 'Unknown' }
    }
  } catch (error) {
    console.error('Location detection error:', error)
  }

  return { country: 'unknown', region: 'unknown', city: 'unknown' }
}

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

export async function GET(request: NextRequest, { params }: { params: Promise<{ trackingId: string }> }) {
  const { trackingId } = await params
  const timestamp = new Date().toISOString()
  const ipAddress = getClientIP(request)
  const userAgent = request.headers.get('user-agent')
  const { deviceType, browser, platform } = parseUserAgent(userAgent)
  const location = await getLocationFromIP(ipAddress)

  // Log the tracking attempt immediately
  console.log(`Email open tracking - ID: ${trackingId}, IP: ${ipAddress}, UA: ${userAgent?.substring(0, 100)}`)

  try {
    // Check if this is a genuine open (not from bots, prefetchers)
    const isGenuine = isGenuineOpen(userAgent, ipAddress)

    // Find tracking record in Supabase
    const { data: trackingRecord, error } = await supabase
      .from('tracking_events')
      .select('batch_id, email, contact_name')
      .eq('id', trackingId)
      .eq('user_id', "user@example.com")
      .single()

    if (error || !trackingRecord) {
      console.log(`Tracking record not found for ID: ${trackingId}`)
      // Return pixel anyway
      return new NextResponse(PIXEL_DATA, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
          "Access-Control-Allow-Origin": "*",
        },
      })
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

    // Return 1x1 transparent pixel
    return new NextResponse(PIXEL_DATA, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (error) {
    console.error("Tracking error:", error)

    // Log error event
    try {
      await supabase
        .from('tracking_events')
        .insert({
          id: trackingId,
          event_type: 'error',
          timestamp: timestamp,
          ip_address: ipAddress,
          user_agent: userAgent,
          user_id: "user@example.com"
        })
    } catch (logError) {
      console.error('Failed to log error event:', logError)
    }

    // Always return pixel even on error
    return new NextResponse(PIXEL_DATA, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    })
  }
}

// 1x1 transparent PNG pixel data
const PIXEL_DATA = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
)
