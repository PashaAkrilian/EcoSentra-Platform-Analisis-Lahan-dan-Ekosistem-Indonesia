"use client"

import { useEffect } from "react"
import { PageContainer } from "@/components/page-header"
import { ErrorState } from "@/components/status"

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Kesalahan halaman:", error.digest ?? error.message)
  }, [error])

  return (
    <PageContainer>
      <ErrorState message="Halaman ini gagal ditampilkan. Data Anda tidak terpengaruh." onRetry={reset} />
    </PageContainer>
  )
}
