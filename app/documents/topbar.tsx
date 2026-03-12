
export function TopBar({ children, title = "Paperless Link" }: { children?: React.ReactNode, title?: React.ReactNode }) {
    return (
        <>
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                {children}
                {/* TODO: Add document list search and filter toolbar */}
            </div>
        </>
    )
}
