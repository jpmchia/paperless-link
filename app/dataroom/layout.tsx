/**
 * Force dark UI for all public dataroom routes (viewer, magic link, login).
 */
export default function DataroomLayout({ children }: { children: React.ReactNode }) {
  return <div className="dark flex h-full min-h-0 flex-col bg-background text-foreground">{children}</div>
}
