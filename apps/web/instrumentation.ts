// Next.js memanggil register() sekali saat server start. Kode khusus Node.js
// dipisah ke instrumentation.node.ts supaya tidak ikut dibundel untuk edge runtime.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation.node")
  }
}
