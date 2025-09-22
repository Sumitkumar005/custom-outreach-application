import nodemailer from "nodemailer"
import fs from "fs/promises"
import path from "path"

const TRACKING_FILE = path.join(process.cwd(), "data", "tracking.json")

interface TrackingRecord {
  id: string
  batchId: string
  contactName: string
  email: string
  sentAt: string
  openedAt?: string
  openCount: number
  clickCount?: number
  openEvents?: OpenEvent[]
  clickEvents?: ClickEvent[]
}

interface OpenEvent {
  timestamp: string
  ipAddress?: string
  userAgent?: string
  country?: string
  region?: string
  city?: string
  deviceType?: string
  browser?: string
  platform?: string
  isGenuine?: boolean
}

interface ClickEvent {
  timestamp: string
  ipAddress?: string
  userAgent?: string
  country?: string
  region?: string
  city?: string
  deviceType?: string
  browser?: string
  platform?: string
  url?: string
  isGenuine?: boolean
}

interface EmailOptions {
  to: string
  subject: string
  htmlContent: string
  textContent: string
  smtpEmail: string
  smtpPassword: string
  trackingId: string
  batchId: string
  contactName: string
  trackingBaseUrl: string
  cc?: string[]
}

interface ContactData {
  recipient_person_name: string
  recipient_university_name: string
  product_name: string
  cta_goal: string
  product_oneliner: string
  product_core_users: string
  product_features_bulleted: string
  product_outcomes_metrics: string
  product_caselets: string
  recipient_public_notes: string
  recipient_business_map: string
  recipient_icp_geos: string
  recipient_offers: string
  relevant_trigger: string
  recipient_pain: string
  lead_source: string
  prospect_persona: string
}

// Generate hyper-personalized email using OpenAI with detailed prompt
export async function generateEmail(contact: ContactData, apiKey: string, customPrompt?: string): Promise<{
  subjectOptions: string[]
  emailVersionA: string
  emailVersionB: string
  linkedInDM: string
  valueMap: string[]
  assumptions: string[]
} | null> {
  try {
    // Use the provided prompt (which now includes sender info and proper formatting requirements)
    const prompt = customPrompt || `Write a professional cold email for ${contact.product_name} to ${contact.recipient_person_name}.

EXACT OUTPUT FORMAT REQUIRED:
**SUBJECT LINE:**
Option 1: [subject line - max 8 words]
Option 2: [subject line - max 8 words]
Option 3: [subject line - max 8 words]

**EMAIL BODY:**
[Complete email content]`

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a professional email marketing assistant. Always follow the exact output format specified in the prompt. Generate personalized, professional cold emails with complete signatures.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500, // Increased to ensure complete responses
      }),
    })

    if (!response.ok) {
      console.error("OpenAI API error:", response.status, response.statusText)
      return null
    }

    const data = await response.json()
    let emailContent = data.choices[0]?.message?.content?.trim() || null

    if (!emailContent) {
      return null
    }

    console.log("Raw AI Response:", emailContent)

    // Parse the response content into structured parts
    let subjectOptions: string[] = []
    let emailVersionA = emailContent

    // Extract subject lines with improved patterns
    const subjectPatterns = [
      /\*\*SUBJECT LINE:\*\*\s*([\s\S]*?)(?=\*\*EMAIL BODY:|\*\*[A-Z]|$)/i,
      /\*\*Subject.*?:\*\*\s*([\s\S]*?)(?=\*\*Email|\*\*[A-Z]|$)/i,
      /Subject.*?:\s*([\s\S]*?)(?=\*\*Email|Email.*?:|\*\*[A-Z]|$)/i
    ]

    for (const pattern of subjectPatterns) {
      const subjectMatch = emailContent.match(pattern)
      if (subjectMatch && subjectMatch[1]) {
        const subjectSection = subjectMatch[1].trim()
        
        // Extract individual options
        const optionLines = subjectSection.split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0)
          
        for (const line of optionLines) {
          // Match "Option X:" pattern
          const optionMatch = line.match(/Option\s+\d+:\s*(.+)/i)
          if (optionMatch && optionMatch[1]) {
            subjectOptions.push(optionMatch[1].trim())
          } else if (line.match(/^\d+\.\s*(.+)/) || line.match(/^-\s*(.+)/) || line.match(/^•\s*(.+)/)) {
            // Handle numbered or bulleted options
            const cleanOption = line.replace(/^\d+\.\s*|^-\s*|^•\s*/, '').trim()
            if (cleanOption.length > 3 && cleanOption.length <= 100) {
              subjectOptions.push(cleanOption)
            }
          }
        }
        
        if (subjectOptions.length > 0) break
      }
    }

    // Extract email body with improved patterns
    const emailPatterns = [
      /\*\*EMAIL BODY:\*\*\s*([\s\S]*?)$/i,
      /\*\*Email.*?:\*\*\s*([\s\S]*?)$/i,
      /Email.*?:\s*([\s\S]*?)$/i
    ]

    for (const pattern of emailPatterns) {
      const emailMatch = emailContent.match(pattern)
      if (emailMatch && emailMatch[1]) {
        emailVersionA = emailMatch[1].trim()
        break
      }
    }

    // If no email body section found, look for greeting patterns
    if (emailVersionA === emailContent || emailVersionA.includes("**SUBJECT LINE:**")) {
      const greetingMatch = emailContent.match(/(Dear|Hi|Hello)\s+[^,\n]+,[\s\S]*$/i)
      if (greetingMatch) {
        emailVersionA = greetingMatch[0].trim()
      } else {
        // Remove subject section if present
        emailVersionA = emailContent.replace(/\*\*SUBJECT LINE:\*\*[\s\S]*?(?=\*\*EMAIL BODY:|\*\*[A-Z]|$)/i, '').trim()
        emailVersionA = emailVersionA.replace(/\*\*EMAIL BODY:\*\*\s*/i, '').trim()
      }
    }

    // Ensure we have at least one subject
    if (subjectOptions.length === 0) {
      // Try to extract from the beginning of content if it looks like subjects
      const lines = emailContent.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0)
      const firstFewLines = lines.slice(0, 5)

      for (const line of firstFewLines) {
        if (line.length < 100 && 
            !line.includes('Dear') && 
            !line.includes('Hi') && 
            !line.includes('Hello') &&
            !line.includes('**') &&
            line.length > 10) {
          subjectOptions.push(line)
        }
      }
      
      // Ultimate fallback
      if (subjectOptions.length === 0) {
        subjectOptions = [`Partnership opportunity with ${contact.recipient_university_name}`]
      }
    }

    // Clean subjects and ensure reasonable length
    subjectOptions = subjectOptions
      .filter(subject => subject.length >= 10 && subject.length <= 100)
      .map(subject => subject.replace(/^["']|["']$/g, '')) // Remove surrounding quotes
      .slice(0, 3) // Max 3 options

    // Ensure we have proper email content
    if (emailVersionA.length < 50 || 
        emailVersionA.includes("**SUBJECT") || 
        !emailVersionA.match(/(Dear|Hi|Hello)/i)) {
      
      // Last resort: create a basic structure
      emailVersionA = `Dear ${contact.recipient_person_name},

I hope this email finds you well. I'm reaching out to introduce ${contact.product_name}, which could benefit ${contact.recipient_university_name}.

Our platform helps streamline visa interview preparation and has shown impressive results including saving 30-45 minutes per student assessment.

I'd love to schedule a brief call to discuss how this could help your international student services.

Best regards,
[Sender Name]
[Sender Designation]  
[Sender Phone]
[Sender Company]`
    }

    console.log('Parsed subjects:', subjectOptions)
    console.log('Email body length:', emailVersionA.length)
    console.log('Email preview:', emailVersionA.substring(0, 200) + '...')

    return {
      subjectOptions: subjectOptions,
      emailVersionA: emailVersionA,
      emailVersionB: "",
      linkedInDM: "",
      valueMap: [],
      assumptions: [],
    }
  } catch (error: any) {
    console.error("Email generation error:", error)
    return null
  }
}

// Create clickable link with tracking
function createTrackingLink(originalUrl: string, trackingId: string, trackingBaseUrl: string): string {
  const encodedUrl = encodeURIComponent(originalUrl)
  return `${trackingBaseUrl}/api/track/click/${trackingId}?url=${encodedUrl}`
}

function addTrackingToEmail(htmlContent: string, trackingId: string, trackingBaseUrl: string): string {
  // Add tracking pixel
  const trackingPixelUrl = `${trackingBaseUrl}/api/track/open?id=${trackingId}`
  const trackingPixel = `<img src="${trackingPixelUrl}" alt="" width="1" height="1" style="display:none !important; visibility:hidden !important; opacity:0 !important; color:transparent !important; height:1px !important; width:1px !important;" border="0" />`

  // Wrap content in proper email HTML structure
  const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ForeignAdmits | VisaMonk.ai</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .email-content { padding: 20px; }
        .cta-button { 
            display: inline-block; 
            padding: 12px 24px; 
            background-color: #007bff; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 15px 0; 
        }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="email-content">
        ${htmlContent}
        
        <div class="footer">
            <p style="font-size: 10px; color: #999;">
                If you no longer wish to receive these emails, you can 
                <a href="${trackingBaseUrl}/unsubscribe?id=${trackingId}" style="color: #999;">unsubscribe here</a>.
            </p>
        </div>
    </div>
    ${trackingPixel}
</body>
</html>`

  // Replace any existing links with tracking links
  const linkRegex = /<a\s+href=["']([^"']+)["'][^>]*>/gi
  const trackedHtml = emailHtml.replace(linkRegex, (match, url) => {
    // Skip if it's already a tracking link or email/tel link
    if (url.includes('/api/track/') || url.startsWith('mailto:') || url.startsWith('tel:')) {
      return match
    }
    const trackingUrl = createTrackingLink(url, trackingId, trackingBaseUrl)
    return match.replace(url, trackingUrl)
  })

  return trackedHtml
}

// Convert HTML to plain text
function htmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

// Send email via SMTP with tracking
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // Add tracking pixel and links to HTML content
    const trackedHtmlContent = addTrackingToEmail(options.htmlContent, options.trackingId, options.trackingBaseUrl)
    
    // Create plain text version if not provided
    const textContent = options.textContent || htmlToText(options.htmlContent)

    // Determine SMTP provider based on email domain
    const emailDomain = options.smtpEmail.toLowerCase()
    const isOutlook = emailDomain.includes('@outlook.com') || emailDomain.includes('@hotmail.com') || emailDomain.includes('@live.com') || emailDomain.includes('@foreignadmits.com')

    const smtpConfig = isOutlook ? {
      host: "smtp.office365.com",
      port: 587,
      secure: false,
      tls: {
        rejectUnauthorized: false
      }
    } : {
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      tls: {
        rejectUnauthorized: false
      }
    }

    // Create transporter with appropriate SMTP settings
    console.log('Creating SMTP transporter for:', options.smtpEmail, 'using', isOutlook ? 'Outlook' : 'Gmail')
    const transporter = nodemailer.createTransport({
      ...smtpConfig,
      auth: {
        user: options.smtpEmail,
        pass: options.smtpPassword,
      },
      debug: true,
      logger: true
    })

    // Verify SMTP connection
    try {
      await transporter.verify()
      console.log('SMTP connection verified successfully')
    } catch (verifyError: any) {
      console.error('SMTP verification failed:', verifyError)
      throw new Error(`SMTP verification failed: ${verifyError.message}`)
    }

    // Send email
    const mailOptions: any = {
      from: `"ForeignAdmits | VisaMonk.ai" <${options.smtpEmail}>`,
      to: options.to,
      subject: options.subject,
      text: textContent,
      html: trackedHtmlContent,
      headers: {
        'X-Tracking-ID': options.trackingId,
      },
    }

    // Add CC recipients if provided
    if (options.cc && options.cc.length > 0) {
      mailOptions.cc = options.cc
    }

    const info = await transporter.sendMail(mailOptions)

    console.log('Email sent successfully:', info.messageId)

    // Record tracking info
    await recordEmailSent({
      id: options.trackingId,
      batchId: options.batchId,
      contactName: options.contactName,
      email: options.to,
      sentAt: new Date().toISOString(),
      openCount: 0,
      clickCount: 0,
    })

    return true
  } catch (error: any) {
    console.error("Email sending error:", error)
    return false
  }
}

// Record email sent for tracking
async function recordEmailSent(record: TrackingRecord): Promise<void> {
  try {
    const dataDir = path.join(process.cwd(), "data")
    try {
      await fs.access(dataDir)
    } catch {
      await fs.mkdir(dataDir, { recursive: true })
    }

    let tracking: TrackingRecord[] = []
    try {
      const data = await fs.readFile(TRACKING_FILE, "utf-8")
      tracking = JSON.parse(data)
    } catch {
      // File doesn't exist, start with empty array
    }

    tracking.push(record)
    await fs.writeFile(TRACKING_FILE, JSON.stringify(tracking, null, 2))
  } catch (error: any) {
    console.error("Failed to record email tracking:", error)
  }
}

// Get tracking records for a batch
export async function getBatchTracking(batchId: string): Promise<TrackingRecord[]> {
  try {
    const data = await fs.readFile(TRACKING_FILE, "utf-8")
    const tracking: TrackingRecord[] = JSON.parse(data)
    return tracking.filter((record) => record.batchId === batchId)
  } catch (error: any) {
    console.error("Failed to get batch tracking:", error)
    return []
  }
}

// Get all tracking records
export async function getAllTracking(): Promise<TrackingRecord[]> {
  try {
    const data = await fs.readFile(TRACKING_FILE, "utf-8")
    return JSON.parse(data)
  } catch (error: any) {
    console.error("Failed to get all tracking:", error)
    return []
  }
}

// Get tracking statistics for a batch
export async function getBatchStats(batchId: string): Promise<{
  totalSent: number
  totalOpened: number
  totalClicked: number
  openRate: number
  clickRate: number
  records: TrackingRecord[]
}> {
  const records = await getBatchTracking(batchId)
  
  const totalSent = records.length
  const totalOpened = records.filter(r => r.openCount > 0).length
  const totalClicked = records.filter(r => (r.clickCount || 0) > 0).length
  
  return {
    totalSent,
    totalOpened,
    totalClicked,
    openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
    clickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
    records
  }
}