import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const session = await getServerSession(authOptions as any)
  const token = (session as any)?.accessToken

  if (!token) {
    return new Response("Unauthorized", { status: 401 })
  }
  
  const baseUrl = process.env.PAPERLESS_API_URL || "http://localhost:8000/"
  
  try {
    const response = await fetch(`${baseUrl}api/documents/${params.id}/preview/`, {
      headers: {
        Authorization: `Token ${token}`
      }
    })
    
    if (!response.ok) {
        return new Response(`Failed to fetch PDF: ${response.status}`, { status: response.status })
    }

    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/pdf"
      }
    })
  } catch (e) {
      console.error("PDF Proxy Error:", e)
      return new Response("Internal Server Error", { status: 500 })
  }
}
