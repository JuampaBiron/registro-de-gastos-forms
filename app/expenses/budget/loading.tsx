// app/expenses/budget/loading.tsx
export default function BudgetLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-6">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          
          {/* Header skeleton */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-full"></div>
              <div className="h-6 w-40 bg-white/20 rounded"></div>
            </div>
            <div className="h-8 w-28 bg-white/20 rounded-full"></div>
          </div>

          <div className="p-6">
            {/* Summary cards skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-100 rounded-xl h-24 animate-pulse"></div>
              <div className="bg-gray-100 rounded-xl h-24 animate-pulse"></div>
              <div className="bg-gray-100 rounded-xl h-24 animate-pulse"></div>
            </div>

            {/* Loading spinner */}
            <div className="text-center py-8">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent mb-3"></div>
              <p className="text-gray-600">Cargando presupuestos...</p>
            </div>

            {/* Budget items skeleton */}
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-gray-100 rounded-lg h-16 animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}