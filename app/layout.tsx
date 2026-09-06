import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PackCheck AI - Legal Metrology Compliance Platform",
  description:
    "Professional regulatory software platform for checking compliance of packaged commodities under the Legal Metrology (Packaged Commodities) Rules, 2011.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="bg-[#F8FAFC] text-[#0F172A] antialiased selection:bg-[#DBEAFE] selection:text-[#1E40AF]"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
