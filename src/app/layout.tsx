import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AccentProvider, AccentScript } from "@/components/accent-provider";
import { CurrencyProvider } from "@/components/currency-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ExFlow — Export Logistics Operating System",
  description:
    "The operational brain for export logistics: invoices, dispatch, stuffing, gate-in, SI and BL in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <AccentScript />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AccentProvider>
            <CurrencyProvider>
              <Providers>
                <TooltipProvider delay={200}>
                  {children}
                  <Toaster richColors closeButton position="top-right" />
                </TooltipProvider>
              </Providers>
            </CurrencyProvider>
          </AccentProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
