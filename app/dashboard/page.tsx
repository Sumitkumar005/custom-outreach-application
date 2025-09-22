"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"
import { Upload, History, BarChart3, Sparkles } from "lucide-react"

// Dynamic imports for better performance - components load only when needed
const UploadBatchSection = dynamic(() => import("@/components/upload-batch-section").then(mod => ({ default: mod.UploadBatchSection })), {
  loading: () => <LoadingSectionSkeleton />,
  ssr: false
})

const BatchHistorySection = dynamic(() => import("@/components/batch-history-section").then(mod => ({ default: mod.BatchHistorySection })), {
  loading: () => <LoadingSectionSkeleton />,
  ssr: false
})

const MonthlyStatsSection = dynamic(() => import("@/components/monthly-stats-section").then(mod => ({ default: mod.MonthlyStatsSection })), {
  loading: () => <LoadingSectionSkeleton />,
  ssr: false
})

function LoadingSectionSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Sparkles className="h-8 w-8 text-blue-500 animate-pulse" />
            <Skeleton className="h-8 w-48" />
          </div>
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>

      {/* Loading Message */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-100">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          <div>
            <p className="text-sm font-medium text-blue-900">Loading your dashboard...</p>
            <p className="text-xs text-blue-700">Preparing your email campaigns and analytics</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-lg" />
        <div className="grid gap-6">
          {/* Main Content Area */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>

          {/* Side Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-20 w-full mb-3" />
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-20 w-full mb-3" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Fun Loading Tips */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
          <Sparkles className="h-4 w-4 animate-pulse" />
          <span>Almost there! Setting up your workspace...</span>
        </div>
        <div className="text-xs text-gray-400">
          💡 Pro tip: Your emails will be ready in just a few seconds!
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("upload")
  const [isLoading, setIsLoading] = useState(true)
  const [showWelcome, setShowWelcome] = useState(false)
  const [preloadedTabs, setPreloadedTabs] = useState<Set<string>>(new Set(["upload"]))

  useEffect(() => {
    // Simulate loading delay for demo purposes - made faster for better UX
    const timer = setTimeout(() => {
      setIsLoading(false)
      // Show welcome message briefly
      setShowWelcome(true)
      setTimeout(() => setShowWelcome(false), 3000)
    }, 800) // Reduced from 1500ms to 800ms for faster feel
    return () => clearTimeout(timer)
  }, [])

  // Preload components when hovering over tabs
  const handleTabHover = (tabValue: string) => {
    if (!preloadedTabs.has(tabValue)) {
      // Preload the component
      if (tabValue === "history") {
        import("@/components/batch-history-section")
      } else if (tabValue === "stats") {
        import("@/components/monthly-stats-section")
      }
      setPreloadedTabs(prev => new Set([...prev, tabValue]))
    }
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    // Preload the component when tab becomes active
    if (!preloadedTabs.has(value)) {
      setPreloadedTabs(prev => new Set([...prev, value]))
    }
  }

   if (isLoading) {
     return (
       <div className="animate-in fade-in-0 duration-300">
         <DashboardSkeleton />
       </div>
     )
   }

   return (
     <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
       {/* Welcome Message */}
       {showWelcome && (
         <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 animate-in slide-in-from-top-2 duration-300">
           <div className="flex items-center space-x-3">
             <Sparkles className="h-5 w-5 text-green-500 animate-pulse" />
             <div>
               <p className="text-sm font-medium text-green-900">Welcome back! 🎉</p>
               <p className="text-xs text-green-700">Your email outreach dashboard is ready to go!</p>
             </div>
           </div>
         </div>
       )}

       <div>
         <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
         <p className="text-muted-foreground">Manage your email outreach campaigns</p>
       </div>

       <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
         <TabsList className="grid w-full grid-cols-3">
           <TabsTrigger
             value="upload"
             className="flex items-center gap-2"
             onMouseEnter={() => handleTabHover("upload")}
           >
             <Upload className="h-4 w-4" />
             Upload Batch
           </TabsTrigger>
           <TabsTrigger
             value="history"
             className="flex items-center gap-2"
             onMouseEnter={() => handleTabHover("history")}
           >
             <History className="h-4 w-4" />
             Batch History
           </TabsTrigger>
           <TabsTrigger
             value="stats"
             className="flex items-center gap-2"
             onMouseEnter={() => handleTabHover("stats")}
           >
             <BarChart3 className="h-4 w-4" />
             Monthly Stats
           </TabsTrigger>
         </TabsList>

         <TabsContent value="upload" className="space-y-6">
           <UploadBatchSection />
         </TabsContent>

         <TabsContent value="history" className="space-y-6">
           <BatchHistorySection />
         </TabsContent>

         <TabsContent value="stats" className="space-y-6">
           <MonthlyStatsSection />
         </TabsContent>
       </Tabs>
     </div>
   )
 }
