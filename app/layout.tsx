import { Inter } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils";
import { SessionProvider } from "@/components/session-provider"
import { JotaiProvider } from "@/components/jotai-provider"
import { RealtimeProvider } from "@/components/realtime-provider"
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <html lang="en" suppressHydrationWarning className={cn("h-screen font-sans", "font-sans", inter.variable)}>
        <head />
        <body className="h-screen w-screen overflow-hidden">
          <SessionProvider>
            <JotaiProvider>
              <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
                <RealtimeProvider>
                  <div className="w-full h-full overflow-hidden">
                    {children}
                  </div>
                </RealtimeProvider>
                <Toaster />
              </ThemeProvider>
            </JotaiProvider>
          </SessionProvider>
        </body>
      </html>
    </>
  )
}
