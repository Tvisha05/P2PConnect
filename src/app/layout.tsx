import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/providers/auth-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { NotificationProvider } from "@/providers/notification-provider";
import { NotificationActionProvider } from "@/providers/notification-action-provider";
import { MatchProposalAlerts } from "@/components/matching/match-proposal-alerts";
import { MutualMatchNotificationsAlert } from "@/components/matching/mutual-match-notifications-alert";
import { Toaster } from "sonner";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Peer Connect",
  description: "Peer-to-peer academic doubt resolution platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fraunces.variable} ${plusJakartaSans.variable} ${geistMono.variable} min-h-screen bg-background font-sans antialiased`}
      >
        <AuthProvider>
          <ThemeProvider>
            <NotificationProvider>
              <NotificationActionProvider>
                <MatchProposalAlerts />
                <MutualMatchNotificationsAlert />
                <Toaster
                  position="top-right"
                  theme="system"
                  toastOptions={{ unstyled: true, classNames: { toast: "" } }}
                />
                {children}
              </NotificationActionProvider>
            </NotificationProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
