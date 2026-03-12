import axios from "axios"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

const api = axios.create({
  baseURL: process.env.PAPERLESS_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

api.interceptors.request.use(async (config) => {
  // In a server component, getServerSession() can be called
  // If it's a client component, we'll need a different approach (like sending token as a prop or using useSession)
  try {
    const session = (await getServerSession(authOptions as any)) as any
    if (session && session.accessToken) {
      config.headers.Authorization = `Token ${session.accessToken}`
    }
  } catch {
    // Will fail on client side since auth() is server only
    // To handle client components safely, we'd provide a separate utility or use api hooks.
  }
  return config
})

export default api
