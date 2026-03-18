import { toast } from "sonner"

type NotifyStyle = {
  background: string
  border: string
  color: string
}

const STYLES: Record<"success" | "update" | "delete" | "error", NotifyStyle> = {
  success: {
    background: "#ecfdf3",
    border: "1px solid #4ade80",
    color: "#14532d",
  },
  update: {
    background: "#eff6ff",
    border: "1px solid #60a5fa",
    color: "#1e3a8a",
  },
  delete: {
    background: "#fef2f2",
    border: "1px solid #f87171",
    color: "#991b1b",
  },
  error: {
    background: "#fff7ed",
    border: "1px solid #fb923c",
    color: "#9a3412",
  },
}

const show = (title: string, description: string, tone: keyof typeof STYLES) => {
  toast(title, {
    description,
    style: STYLES[tone],
  })
}

export const appNotify = {
  created(entity: string) {
    const entityLabel = entity.trim().toLowerCase()
    show(`${entity} added successfully.`, `${entityLabel} record inserted successfully.`, "success")
  },
  updated(entity: string) {
    const entityLabel = entity.trim().toLowerCase()
    show(`${entity} updated successfully.`, `${entityLabel} record updated successfully.`, "update")
  },
  deleted(entity: string) {
    const entityLabel = entity.trim().toLowerCase()
    show(`${entity} deleted successfully.`, `${entityLabel} record deleted successfully.`, "delete")
  },
  failed(action: string, message: string) {
    show(`${action} failed.`, message, "error")
  },
  completed(entity: string, message?: string) {
    const entityLabel = entity.trim().toLowerCase()
    show(`${entity} completed successfully.`, message || `${entityLabel} workflow completed successfully.`, "success")
  },
  info(title: string, message: string) {
    show(title, message, "update")
  },
}