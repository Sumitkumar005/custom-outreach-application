"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronDown, ChevronRight, History, Eye, Mail, Clock, CheckCircle, XCircle, Trash2, RefreshCw, Play, Pause } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface BatchRecord {
  id: string
  uploadTime: string
  csvName: string
  totalEmails: number
  delivered: number
  opened: number
  openRate: number
}

interface ContactDetail {
  name: string
  email: string
  company: string
  delivered: boolean
  opened: boolean
  openCount: number
  sentAt?: string
  openedAt?: string
}

interface BatchDetails {
  batch: BatchRecord
  contacts: ContactDetail[]
}

export function BatchHistorySection() {
  const [batches, setBatches] = useState<BatchRecord[]>([])
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null)
  const [selectedBatch, setSelectedBatch] = useState<BatchDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [selectedBatches, setSelectedBatches] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false)
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const [realTimeEnabled, setRealTimeEnabled] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchBatches()
  }, [])

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefreshEnabled) {
      refreshIntervalRef.current = setInterval(() => {
        fetchBatches()
      }, 5000) // Refresh every 5 seconds
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [autoRefreshEnabled])

  // Real-time updates effect
  useEffect(() => {
    if (realTimeEnabled) {
      eventSourceRef.current = new EventSource('/api/events')

      eventSourceRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'update' || data.type === 'initial') {
            setBatches(data.batches || [])
            setLastRefreshTime(new Date())
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error)
        }
      }

      eventSourceRef.current.onerror = (error) => {
        console.error('SSE connection error:', error)
        toast({
          title: "Connection Error",
          description: "Real-time updates disconnected",
          variant: "destructive",
        })
        setRealTimeEnabled(false)
      }

      return () => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close()
          eventSourceRef.current = null
        }
      }
    } else {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [realTimeEnabled, toast])

  const fetchBatches = async () => {
    try {
      setIsRefreshing(true)
      const response = await fetch("/api/batch/history")
      if (response.ok) {
        const data = await response.json()
        setBatches(data.batches || [])
        setLastRefreshTime(new Date())
      }
    } catch (error) {
      console.error("Failed to fetch batches:", error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const fetchBatchDetails = async (batchId: string) => {
    setIsLoadingDetails(true)
    try {
      const response = await fetch(`/api/batch/${batchId}/details`)
      if (response.ok) {
        const data: BatchDetails = await response.json()
        setSelectedBatch(data)
      }
    } catch (error) {
      console.error("Failed to fetch batch details:", error)
    } finally {
      setIsLoadingDetails(false)
    }
  }

  const toggleExpanded = (batchId: string) => {
    setExpandedBatch(expandedBatch === batchId ? null : batchId)
  }

  const handleViewDetails = (batchId: string) => {
    fetchBatchDetails(batchId)
  }

  const handleSelectBatch = (batchId: string, checked: boolean) => {
    const newSelected = new Set(selectedBatches)
    if (checked) {
      newSelected.add(batchId)
    } else {
      newSelected.delete(batchId)
    }
    setSelectedBatches(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedBatches(new Set(batches.map(batch => batch.id)))
    } else {
      setSelectedBatches(new Set())
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedBatches.size === 0) return

    setIsDeleting(true)
    try {
      const response = await fetch("/api/batch/history", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ batchIds: Array.from(selectedBatches) }),
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Success",
          description: result.message,
        })
        setSelectedBatches(new Set())
        await fetchBatches() // Refresh the batch list
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to delete batches",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete batches",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleManualRefresh = async () => {
    await fetchBatches()
    toast({
      title: "Refreshed",
      description: "Batch data has been updated",
    })
  }

  const toggleAutoRefresh = () => {
    setAutoRefreshEnabled(!autoRefreshEnabled)
    toast({
      title: autoRefreshEnabled ? "Auto-refresh disabled" : "Auto-refresh enabled",
      description: autoRefreshEnabled ? "Manual refresh required" : "Data will refresh every 5 seconds",
    })
  }

  const toggleRealTime = () => {
    setRealTimeEnabled(!realTimeEnabled)
    toast({
      title: realTimeEnabled ? "Real-time disabled" : "Real-time enabled",
      description: realTimeEnabled ? "Manual refresh required" : "Data will update instantly when emails are opened",
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getOpenRateColor = (rate: number) => {
    if (rate >= 30) return "bg-green-100 text-green-800"
    if (rate >= 15) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  const getDeliveryRateColor = (delivered: number, total: number) => {
    const rate = (delivered / total) * 100
    if (rate >= 95) return "bg-green-100 text-green-800"
    if (rate >= 80) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Batch History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Loading batch history...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Batch History
              </CardTitle>
              <CardDescription>View all past email campaigns and their performance metrics</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {lastRefreshTime && (
                <span className="text-xs text-muted-foreground">
                  Last updated: {formatDate(lastRefreshTime.toISOString())}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant={autoRefreshEnabled ? "default" : "outline"}
                size="sm"
                onClick={toggleAutoRefresh}
                className="flex items-center gap-2"
              >
                {autoRefreshEnabled ? (
                  <>
                    <Pause className="h-4 w-4" />
                    Stop Auto
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Auto Refresh
                  </>
                )}
              </Button>
              <Button
                variant={realTimeEnabled ? "default" : "outline"}
                size="sm"
                onClick={toggleRealTime}
                className="flex items-center gap-2"
              >
                {realTimeEnabled ? (
                  <>
                    <Pause className="h-4 w-4" />
                    Stop Real-time
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Real-time
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No batches found. Upload your first CSV to get started.
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedBatches.size === batches.length && batches.length > 0}
                        onCheckedChange={(checked) => handleSelectAll(checked === true)}
                        aria-label="Select all batches"
                      />
                    </TableHead>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Batch ID</TableHead>
                    <TableHead>Upload Time</TableHead>
                    <TableHead>CSV Name</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Delivered</TableHead>
                    <TableHead className="text-center">Opened</TableHead>
                    <TableHead className="text-center">Open Rate</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch) => (
              <TableRow key={batch.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <Checkbox
                    checked={selectedBatches.has(batch.id)}
                    onCheckedChange={(checked) => handleSelectBatch(batch.id, checked === true)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Select batch ${batch.id}`}
                  />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => toggleExpanded(batch.id)} className="p-1">
                    {expandedBatch === batch.id ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
                <TableCell className="font-mono text-sm">{batch.id.slice(0, 8)}...</TableCell>
                <TableCell>{formatDate(batch.uploadTime)}</TableCell>
                <TableCell>{batch.csvName}</TableCell>
                <TableCell className="text-center">{batch.totalEmails}</TableCell>
                <TableCell className="text-center">
                  <Badge className={getDeliveryRateColor(batch.delivered, batch.totalEmails)}>
                    {batch.delivered}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">{batch.opened}</TableCell>
                <TableCell className="text-center">
                  <Badge className={getOpenRateColor(batch.openRate)}>{batch.openRate.toFixed(1)}%</Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => handleViewDetails(batch.id)} className="p-1">
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {selectedBatches.size > 0 && (
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">
                {selectedBatches.size} batch(es) selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete Selected"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Details Dialog */}
      <Dialog open={!!selectedBatch} onOpenChange={() => setSelectedBatch(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Batch Details</DialogTitle>
            <DialogDescription>
              {selectedBatch && `Detailed view of batch ${selectedBatch.batch.id.slice(0, 8)}...`}
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="text-center py-8 text-muted-foreground">Loading batch details...</div>
          ) : selectedBatch ? (
            <div className="space-y-6">
              {/* Batch Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{selectedBatch.batch.totalEmails}</div>
                  <div className="text-sm text-muted-foreground">Total Emails</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{selectedBatch.batch.delivered}</div>
                  <div className="text-sm text-muted-foreground">Delivered</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{selectedBatch.batch.opened}</div>
                  <div className="text-sm text-muted-foreground">Opened</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{selectedBatch.batch.openRate.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Open Rate</div>
                </div>
              </div>

              {/* Contact Details */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Contact Details</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Opens</TableHead>
                      <TableHead>Last Activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedBatch.contacts.map((contact, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{contact.name}</TableCell>
                        <TableCell>{contact.email}</TableCell>
                        <TableCell>{contact.company}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            {contact.delivered ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            {contact.opened && <Eye className="h-4 w-4 text-blue-600" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{contact.openCount}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {contact.openedAt ? (
                              <div className="flex items-center gap-1">
                                <Eye className="h-3 w-3 text-blue-600" />
                                {formatDate(contact.openedAt)}
                              </div>
                            ) : contact.sentAt ? (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3 text-green-600" />
                                {formatDate(contact.sentAt)}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                Not sent
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
