import { Geist, Geist_Mono, Inter } from "next/font/google"
import { Geist as GeistSans } from "next/font/google"
import { Geist_Mono as GeistMono } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils";
import { SessionProvider } from "@/components/session-provider"
import { JotaiProvider } from "@/components/jotai-provider"
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <html lang="en" suppressHydrationWarning className={cn("h-screen font-sans", "font-sans", inter.variable)}>
        <head />
        <body className="h-screen w-screen overflow-hidden">
          <SessionProvider>
            <JotaiProvider>
              <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
                <div className="w-full h-full overflow-hidden">
                  {children}
                </div>
                <Toaster />
              </ThemeProvider>
            </JotaiProvider>
          </SessionProvider>
        </body>
      </html>
    </>
  )
}
