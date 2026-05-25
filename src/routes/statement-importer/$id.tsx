import { createFileRoute } from '@tanstack/react-router'
import ViewBankStatementImportLog from '@/pages/ViewBankStatementImportLog'

export const Route = createFileRoute('/statement-importer/$id')({
  component: ViewBankStatementImportLog,
})
