import { TopBarProps } from "@/components/app-shell"

export function TopBar({ title = "Paperless Link" }: TopBarProps) {
    return (
        <>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        </>
    )
}
