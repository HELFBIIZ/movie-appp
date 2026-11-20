export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/login"],
      },
    ],
    sitemap: "https://vxnta.app/sitemap.xml",
    host: "https://vxnta.app",
  }
}