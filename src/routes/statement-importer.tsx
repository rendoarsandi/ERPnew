import { createFileRoute } from '@tanstack/react-router'
import BankStatementImporterContainer from '@/pages/BankStatementImporterContainer'

export const Route = createFileRoute('/statement-importer')({
  component: BankStatementImporterContainer,
})
