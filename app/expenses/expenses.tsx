// expenses/expenses.tsx
import ExpenseList from '@/components/ExpenseList';

export default function ExpensesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-6 flex flex-col justify-center">
      <div className="relative sm:max-w-4xl sm:mx-auto w-full px-4">
        <div className="relative bg-white shadow-lg rounded-2xl p-8">
          <ExpenseList />
        </div>
      </div>
    </div>
  );
}