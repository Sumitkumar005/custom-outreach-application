"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Sparkles, Mail, Users, BarChart3, Zap } from "lucide-react"

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo/Brand Section */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Mail className="h-8 w-8 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                <Sparkles className="h-3 w-3 text-white animate-pulse" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">Email Outreach Manager</h1>
            <p className="text-gray-600">Preparing your dashboard...</p>
          </div>
        </div>

        {/* Loading Animation */}
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
            <p className="text-center text-sm text-gray-500">Loading your workspace...</p>
          </div>
        </div>

        {/* Feature Preview Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-white/20">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="h-4 w-4 text-blue-500" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-2 w-full mb-1" />
            <Skeleton className="h-2 w-3/4" />
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-white/20">
            <div className="flex items-center space-x-2 mb-2">
              <BarChart3 className="h-4 w-4 text-purple-500" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-2 w-full mb-1" />
            <Skeleton className="h-2 w-2/3" />
          </div>
        </div>

        {/* Loading Tips */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <Zap className="h-4 w-4 animate-pulse" />
            <span>Optimizing for speed...</span>
          </div>
          <div className="text-xs text-gray-400 space-y-1">
            <div>💡 Did you know? Our AI generates personalized emails in seconds!</div>
            <div>🚀 Processing your workspace with lightning speed...</div>
            <div>✨ Almost ready to supercharge your outreach!</div>
          </div>
        </div>

        {/* Fun Progress Indicators */}
        <div className="flex justify-center space-x-4 text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
            <span>Authenticating</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
            <span>Loading Data</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
            <span>Preparing UI</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      try {
        // Add a small delay to show the beautiful loading screen
        await new Promise(resolve => setTimeout(resolve, 1000))

        const response = await fetch("/api/auth/session", {
          // Add cache control for better performance
          headers: {
            'Cache-Control': 'max-age=300', // Cache for 5 minutes
          },
        })
        const { isAuthenticated } = await response.json()

        if (isAuthenticated) {
          router.push("/dashboard")
        } else {
          router.push("/login")
        }
      } catch (error) {
        console.error("[v0] Auth check failed:", error)
        router.push("/login")
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return <LoadingScreen />
  }

  return null
}
