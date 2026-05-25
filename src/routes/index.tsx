import { createFileRoute } from '@tanstack/react-router'
import BankReconciliation from '@/pages/BankReconciliation'

export const Route = createFileRoute('/')({
  component: BankReconciliationPage,
})

function BankReconciliationPage() {
  return <BankReconciliation />
}
