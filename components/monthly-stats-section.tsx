"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { BarChart3, TrendingUp, Mail, Eye, Send, Activity } from "lucide-react"

interface MonthlyStats {
  month: string
  sent: number
  delivered: number
  opened: number
  openRate: number
}

interface OverviewStats {
  totalSent: number
  totalDelivered: number
  totalOpened: number
  averageOpenRate: number
  deliveryRate: number
  totalBatches: number
  recentActivity: {
    sent: number
    delivered: number
    opened: number
    batches: number
  }
}

export function MonthlyStatsSection() {
  const [stats, setStats] = useState<MonthlyStats[]>([])
  const [overview, setOverview] = useState<OverviewStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStats()
    fetchOverview()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/stats/monthly")
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats || [])
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    }
  }

  const fetchOverview = async () => {
    try {
      const response = await fetch("/api/stats/overview")
      if (response.ok) {
        const data = await response.json()
        setOverview(data.overview)
      }
    } catch (error) {
      console.error("Failed to fetch overview:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Monthly Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Loading statistics...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sent</p>
                <p className="text-2xl font-bold">{overview?.totalSent.toLocaleString() || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {overview?.recentActivity.sent || 0} in last 30 days
                </p>
              </div>
              <Send className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Delivered</p>
                <p className="text-2xl font-bold">{overview?.totalDelivered.toLocaleString() || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {overview?.deliveryRate.toFixed(1) || 0}% delivery rate
                </p>
              </div>
              <Mail className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Opened</p>
                <p className="text-2xl font-bold">{overview?.totalOpened.toLocaleString() || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {overview?.recentActivity.opened || 0} in last 30 days
                </p>
              </div>
              <Eye className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Open Rate</p>
                <p className="text-2xl font-bold">{overview?.averageOpenRate.toFixed(1) || 0}%</p>
                <p className="text-xs text-muted-foreground mt-1">{overview?.totalBatches || 0} total batches</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Card */}
      {overview?.recentActivity && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-xl font-bold text-primary">{overview.recentActivity.batches}</div>
                <div className="text-sm text-muted-foreground">Batches</div>
              </div>
              <div>
                <div className="text-xl font-bold text-blue-600">{overview.recentActivity.sent.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Emails Sent</div>
              </div>
              <div>
                <div className="text-xl font-bold text-green-600">
                  {overview.recentActivity.delivered.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Delivered</div>
              </div>
              <div>
                <div className="text-xl font-bold text-orange-600">
                  {overview.recentActivity.opened.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Opened</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Email Volume Trends</CardTitle>
            <CardDescription>Monthly sent and delivered emails</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="sent" fill="hsl(var(--chart-1))" name="Sent" />
                <Bar dataKey="delivered" fill="hsl(var(--chart-2))" name="Delivered" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open Rate Trends</CardTitle>
            <CardDescription>Monthly email open rates</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}%`, "Open Rate"]} />
                <Line
                  type="monotone"
                  dataKey="openRate"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2}
                  name="Open Rate"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Breakdown</CardTitle>
          <CardDescription>Detailed statistics for the last 12 months</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.length === 0 || stats.every((stat) => stat.sent === 0) ? (
            <div className="text-center py-8 text-muted-foreground">
              No data available. Start sending campaigns to see statistics.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                  <TableHead className="text-right">Opened</TableHead>
                  <TableHead className="text-right">Open Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats
                  .filter((stat) => stat.sent > 0)
                  .map((stat) => (
                    <TableRow key={stat.month}>
                      <TableCell className="font-medium">{stat.month}</TableCell>
                      <TableCell className="text-right">{stat.sent.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{stat.delivered.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{stat.opened.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{stat.openRate.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
