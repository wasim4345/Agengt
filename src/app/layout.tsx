import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "IIMCIP · Programme OS",
  description:
    "Interactive programme management prototype for IIMCIP leadership.",
  icons: {
    icon: "/brand/iimcip-mark.png",
    apple: "/brand/iimcip-mark.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
