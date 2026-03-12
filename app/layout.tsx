import "styles/globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"

import { SessionProvider } from "@/components/session-provider"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <html lang="en" suppressHydrationWarning className={cn("h-screen font-sans", inter.variable)}>
        <head />
        <body className="h-screen w-screen overflow-hidden">
          <SessionProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
              <div className="w-full h-full overflow-hidden">
                {children}
              </div>
              <Toaster />
            </ThemeProvider>
          </SessionProvider>
        </body>
      </html>
    </>
  )
}
