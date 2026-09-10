import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "VidyaSaarthi | Secure Counselling & Choice Filling",
  description: "A secure counselling workspace for student profiles, document management, college choice filling and locked preference lists.",
  icons: {
    icon: "/vidyasaarthi-brand-logo.png",
    shortcut: "/vidyasaarthi-brand-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
