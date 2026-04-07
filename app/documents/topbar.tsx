
export function TopBar({ children, title = "Paperless Link" }: { children?: React.ReactNode, title?: React.ReactNode }) {
    return (
        <>
            <div className="flex flex-col gap-2">
                <h1 className="ui-page-title">{title}</h1>
                {children}
                {/* TODO: Add document list search and filter toolbar */}
            </div>
        </>
    )
}
