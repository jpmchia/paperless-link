
export function TopBar({ children, title = "Document" }: { children: React.ReactNode, title?: React.ReactNode }) {
    return (
        <>
            <div className="flex flex-col gap-2">
                <h1 className="text-xl font-bold tracking-tight">{title}</h1>
                {children}
            </div>
        </>
    )
}
