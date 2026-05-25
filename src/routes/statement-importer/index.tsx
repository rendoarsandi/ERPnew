import { createFileRoute } from '@tanstack/react-router'
import BankStatementImporter from '@/pages/BankStatementImporter'

export const Route = createFileRoute('/statement-importer/')({
  component: BankStatementImporter,
})
