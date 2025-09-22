"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Upload, FileText, Send, AlertCircle, CheckCircle, Loader2, Mail, Eye, Sparkles, MessageSquare } from "lucide-react"
import { EmailPreviewList } from "./email-preview-list"

interface ProcessResponse {
  success: boolean
  batchId: string
  totalContacts: number
  message: string
  error?: string
}

interface SendResponse {
  success: boolean
  delivered: number
  total: number
  errors?: string[]
  message: string
}

interface GeneratedEmail {
  id: string
  contactName: string
  companyName: string
  email: string
  subject: string
  htmlContent: string
  textContent: string
  trackingId: string
  cc?: string[] // Optional CC recipients
}

interface GenerateResponse {
  success: boolean
  generatedEmails: GeneratedEmail[]
  total: number
  generated: number
  errors?: string[]
  message: string
}

export function UploadBatchSection() {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<"idle" | "processing" | "ready" | "generating" | "preview" | "sending" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [batchInfo, setBatchInfo] = useState<{ id: string; totalContacts: number } | null>(null)
  const [generatedEmails, setGeneratedEmails] = useState<GeneratedEmail[]>([])
  const [sendResults, setSendResults] = useState<SendResponse | null>(null)
  const [globalCC, setGlobalCC] = useState<string>("")
  const [useCustomPrompt, setUseCustomPrompt] = useState<boolean>(false)
  const [customPrompt, setCustomPrompt] = useState<string>("")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type === "text/csv" || selectedFile.name.endsWith(".csv")) {
        setFile(selectedFile)
        setStatus("idle")
        setMessage("")
        setBatchInfo(null)
        setSendResults(null)
      } else {
        setStatus("error")
        setMessage("Please select a valid CSV file")
        setFile(null)
      }
    }
  }

  const simulateProgress = (maxProgress = 90) => {
    setProgress(0)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= maxProgress) {
          clearInterval(interval)
          return maxProgress
        }
        // Add a smooth progress increment with a cap
        const increment = Math.min(Math.random() * 15, maxProgress - prev)
        return prev + increment
      })
    }, 500)
    return interval
  }

  const handleProcessBatch = async () => {
    if (!file) {
      setStatus("error")
      setMessage("Please select a CSV file first")
      return
    }

    setIsProcessing(true)
    setStatus("processing")
    setMessage("Validating CSV format and processing contacts...")

    const progressInterval = simulateProgress()

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/batch/process", {
        method: "POST",
        body: formData,
      })

      const data: ProcessResponse = await response.json()

      clearInterval(progressInterval)

      if (response.ok && data.success) {
        setProgress(100)
        setStatus("ready")
        setMessage("CSV processed successfully! Ready to generate and send emails.")
        setBatchInfo({
          id: data.batchId,
          totalContacts: data.totalContacts,
        })
      } else {
        setStatus("error")
        setMessage(data.error || "Failed to process batch")
        setProgress(0)
      }
    } catch (error) {
      clearInterval(progressInterval)
      setStatus("error")
      setMessage("Network error occurred while processing the batch")
      setProgress(0)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleGenerateEmails = async () => {
    if (!batchInfo) return

    setIsGenerating(true)
    setStatus("generating")
    setMessage("Generating personalized emails...")
    setGeneratedEmails([])

    const progressInterval = simulateProgress(90)

    try {
      // Fetch sender details from settings
      const settingsResponse = await fetch("/api/settings", {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      let senderDetails = {}
      if (settingsResponse.ok) {
        const settings = await settingsResponse.json()
        senderDetails = {
          senderName: settings.senderName || "",
          senderDesignation: settings.senderDesignation || "",
          senderPhone: settings.senderPhone || "",
          senderCompany: settings.senderCompany || ""
        }
      }

      const requestBody: any = {
        batchId: batchInfo.id,
        ...senderDetails
      }

      if (globalCC.trim()) {
        requestBody.globalCC = globalCC.trim().split(',').map((email: string) => email.trim()).filter((email: string) => email.length > 0)
      }
      if (useCustomPrompt && customPrompt.trim()) {
        requestBody.customPrompt = customPrompt.trim()
      }

      const response = await fetch("/api/batch/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      const data: GenerateResponse = await response.json()

      clearInterval(progressInterval)
      setProgress(100)

      if (response.ok && data.success) {
        setStatus("preview")
        setMessage("Emails generated successfully! Review them before sending.")
        // Apply global CC to all generated emails if specified
        const emailsWithCC = data.generatedEmails.map(email => ({
          ...email,
          cc: globalCC.trim() ? globalCC.trim().split(',').map((email: string) => email.trim()).filter((email: string) => email.length > 0) : undefined
        }))
        setGeneratedEmails(emailsWithCC)
      } else {
        setStatus("error")
        setMessage(data.message || "Failed to generate emails")
        setProgress(0)
      }
    } catch (error) {
      clearInterval(progressInterval)
      setStatus("error")
      setMessage("Network error occurred while generating emails")
      setProgress(0)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSendEmails = async () => {
    if (!batchInfo || generatedEmails.length === 0) return

    setIsSending(true)
    setStatus("sending")
    setMessage("Sending emails...")
    setSendResults(null)

    const progressInterval = simulateProgress(95)

    try {
      const response = await fetch("/api/batch/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          batchId: batchInfo.id,
          generatedEmails // Send the generated emails with any edits
        }),
      })

      const data: SendResponse = await response.json()

      clearInterval(progressInterval)
      setProgress(100)

      if (response.ok && data.success) {
        setStatus("success")
        setMessage(data.message)
        setSendResults(data)
      } else {
        setStatus("error")
        setMessage(data.message || "Failed to send emails")
      }
    } catch (error) {
      clearInterval(progressInterval)
      setStatus("error")
      setMessage("Network error occurred while sending emails")
      setProgress(0)
    } finally {
      setIsSending(false)
    }
  }

  const handleEmailEdit = (id: string, content: string, cc?: string[]) => {
    setGeneratedEmails(prev => prev.map(email =>
      email.id === id ? { ...email, htmlContent: content, textContent: content.replace(/<[^>]*>/g, ""), cc } : email
    ))
  }

  const resetForm = () => {
    setFile(null)
    setStatus("idle")
    setMessage("")
    setProgress(0)
    setBatchInfo(null)
    setSendResults(null)
    setGlobalCC("")
    // Reset file input
    const fileInput = document.getElementById("csv-file") as HTMLInputElement
    if (fileInput) {
      fileInput.value = ""
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload CSV Batch
          </CardTitle>
          <CardDescription>Upload a CSV file with columns: Country, States/City, Name, Designation, Mail, University</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv-file">CSV File</Label>
            <div className="flex items-center gap-4">
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isProcessing || isSending}
                className="flex-1 cursor-pointer border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {file ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  {file.name}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                  <Sparkles className="h-4 w-4" />
                  Loading batch file...
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="global-cc">Global CC Recipients (Optional)</Label>
            <Input
              id="global-cc"
              type="text"
              placeholder="cc@example.com, manager@company.com"
              value={globalCC}
              onChange={(e) => setGlobalCC(e.target.value)}
              disabled={isProcessing || isGenerating || isSending}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Add email addresses that will be CC'd on all emails in this batch. Separate multiple emails with commas.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="use-custom-prompt"
                checked={useCustomPrompt}
                onCheckedChange={(checked) => setUseCustomPrompt(checked as boolean)}
                disabled={isProcessing || isGenerating || isSending}
              />
              <Label htmlFor="use-custom-prompt" className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Use Custom Prompt
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Enable this to provide a custom prompt for AI email generation instead of using the default prompt.
            </p>
            {useCustomPrompt && (
              <div className="space-y-2">
                <Label htmlFor="custom-prompt" className="text-sm font-medium">
                  Custom Prompt
                </Label>
                <Textarea
                  id="custom-prompt"
                  placeholder="Enter your custom prompt for AI email generation. Include instructions for tone, content, and any specific requirements..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  disabled={isProcessing || isGenerating || isSending}
                  className="min-h-[100px] resize-none"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  The AI will use this prompt to generate personalized emails. Be specific about the tone, content, and any requirements.
                </p>
              </div>
            )}
          </div>

          {(status === "processing" || status === "sending") && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {message}
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {status === "ready" && batchInfo && (
            <Alert className="border-blue-200 bg-blue-50">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <div className="space-y-1">
                  <p>{message}</p>
                  <p className="text-sm">
                    <strong>Batch ID:</strong> {batchInfo.id.slice(0, 8)}...
                  </p>
                  <p className="text-sm">
                    <strong>Contacts:</strong> {batchInfo.totalContacts}
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {status === "generating" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Sparkles className="h-6 w-6 animate-pulse text-blue-500" />
                    Generating Emails
                  </h2>
                  <p className="text-muted-foreground">
                    AI is crafting personalized emails for your contacts...
                  </p>
                </div>
              </div>
              <div className="grid gap-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Card key={index} className="animate-pulse">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-6 w-8" />
                          <Skeleton className="h-6 w-32" />
                        </div>
                        <Skeleton className="h-8 w-20" />
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-48 mb-2" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {status === "preview" && generatedEmails.length > 0 && (
            <EmailPreviewList
              emails={generatedEmails}
              onSend={handleSendEmails}
              onEmailEdit={handleEmailEdit}
              isLoading={isSending}
            />
          )}

          {status === "success" && sendResults && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="space-y-2">
                  <p>{message}</p>
                  <div className="text-sm space-y-1">
                    <p>
                      <strong>Delivered:</strong> {sendResults.delivered} / {sendResults.total}
                    </p>
                    <p>
                      <strong>Success Rate:</strong> {((sendResults.delivered / sendResults.total) * 100).toFixed(1)}%
                    </p>
                    {sendResults.errors && sendResults.errors.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-orange-700">
                          View {sendResults.errors.length} errors
                        </summary>
                        <ul className="mt-1 text-xs space-y-1 ml-4">
                          {sendResults.errors.slice(0, 5).map((error, index) => (
                            <li key={index} className="text-orange-600">
                              • {error}
                            </li>
                          ))}
                          {sendResults.errors.length > 5 && (
                            <li className="text-orange-600">• ... and {sendResults.errors.length - 5} more</li>
                          )}
                        </ul>
                      </details>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {status === "error" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            {status === "idle" && (
              <Button onClick={handleProcessBatch} disabled={!file || isProcessing} className="flex-1">
                <Send className="h-4 w-4 mr-2" />
                {isProcessing ? "Processing..." : "Process CSV Batch"}
              </Button>
            )}

            {status === "ready" && (
              <Button onClick={handleGenerateEmails} disabled={isGenerating} className="flex-1">
                <Eye className="h-4 w-4 mr-2" />
                {isGenerating ? "Generating..." : "Preview Emails"}
              </Button>
            )}

            {status === "preview" && (
              <Button onClick={handleSendEmails} disabled={isSending} className="flex-1">
                <Mail className="h-4 w-4 mr-2" />
                {isSending ? "Sending..." : `Send ${generatedEmails.length} Emails`}
              </Button>
            )}

            {(status === "success" || status === "error") && (
              <Button variant="outline" onClick={resetForm} className="flex-1 bg-transparent">
                Upload New File
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CSV Format Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-3">
            <p>Your CSV file must contain the following columns (case-insensitive):</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>
                <strong>Country</strong> - Country of the contact (required)
              </li>
              <li>
                <strong>States/City</strong> - State or city of the contact (required)
              </li>
              <li>
                <strong>Name</strong> - Contact person's full name (required)
              </li>
              <li>
                <strong>Designation</strong> - Job title or position (optional)
              </li>
              <li>
                <strong>Mail</strong> - Valid email address (optional)
              </li>
              <li>
                <strong>University</strong> - University name (optional)
              </li>
            </ul>

            <div className="bg-muted p-3 rounded-md">
              <p className="font-medium mb-2">Example CSV format:</p>
              <code className="text-xs">
                Country,States/City,Name,Designation,Mail,University
                <br />
                USA,California,John Smith,Professor,john@example.com,Stanford University
                <br />
                UK,London,Jane Doe,Dean,jane@company.com,University of London
              </code>
            </div>

            <div className="space-y-1">
              <p className="font-medium">Important notes:</p>
              <ul className="list-disc list-inside space-y-1 ml-4 text-xs">
                <li>Maximum 100 rows per batch for optimal performance</li>
                <li>Country, States/City, Name are required</li>
                <li>Designation, Mail, University are optional - can be left blank</li>
                <li>Email addresses must be valid format (when provided)</li>
                <li>File must have .csv extension</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
