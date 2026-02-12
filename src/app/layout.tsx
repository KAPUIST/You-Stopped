import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "youStopped | 러닝 데이터, 한 번 보고 버리지 마세요",
  description:
    "사진 한 장이면 기록 끝. AI가 당신의 러닝 데이터를 성적표로 만들어드립니다.",
  openGraph: {
    title: "youStopped | 러닝 데이터, 한 번 보고 버리지 마세요",
    description:
      "사진 한 장이면 기록 끝. AI가 당신의 러닝 데이터를 성적표로 만들어드립니다.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
