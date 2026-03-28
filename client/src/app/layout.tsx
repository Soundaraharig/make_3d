import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Antigravity3D — 2D to 3D Mesh Converter",
  description:
    "Convert 2D images and multi-angle videos into stunning 3D meshes (.stl/.obj). Powered by computer vision and AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body>{children}</body>
    </html>
  );
}
