import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "UAP Explorer — Official Government UAP/UFO Document Database",
  description:
    "An independent, searchable index of officially declassified U.S. government UAP and UFO documents. Browse by agency, date, location, and evidence type.",
  openGraph: {
    title: "UAP Explorer",
    description: "Browse officially declassified U.S. government UAP documents.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-200 antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
