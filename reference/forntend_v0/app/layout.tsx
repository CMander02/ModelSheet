import type React from "react"
import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "开源模型参数对比 - Model Parameter Comparison",
  description: "聚合并对比主流开源大模型的参数配置，支持自定义列显示、复杂度配置和多维度排序。",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh" data-theme="light">
      <head>
        <meta name="theme-color" content="#6d28d9" />
      </head>
      <body style={{ fontFamily: '"Roboto", sans-serif' }}>{children}</body>
    </html>
  )
}
