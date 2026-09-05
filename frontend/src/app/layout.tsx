import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/context/AuthContext";
import VisitorTracker from "@/components/VisitorTracker";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Digital Wealth Partners",
  description: "Secure crypto asset management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <link rel="icon" href="/hero-logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/hero-logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <VisitorTracker />
            {children}
            <Script id="smartsupp-loader" strategy="afterInteractive">
              {`
                var _smartsupp = _smartsupp || {};
                _smartsupp.key = '7b2d98b24e8eccb17a8972034c9e3b150a3d92ab';
                _smartsupp.color = '#2563eb';
                if (!window.smartsupp) {
                  (function(d) {
                    var s,c,o=window.smartsupp=function(){ o._.push(arguments)};o._=[];
                    s=d.getElementsByTagName('script')[0];c=d.createElement('script');
                    c.type='text/javascript';c.charset='utf-8';c.async=true;
                    c.src='https://www.smartsuppchat.com/loader.js?';s.parentNode.insertBefore(c,s);
                  })(document);
                }
              `}
            </Script>
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-color)",
                  backdropFilter: "blur(12px)",
                },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

