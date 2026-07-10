import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HPP Program",
  description: "Hitung Harga Pokok Penjualan dengan metode FIFO",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full bg-neutral-50 font-sans text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        {children}
      </body>
    </html>
  );
}
