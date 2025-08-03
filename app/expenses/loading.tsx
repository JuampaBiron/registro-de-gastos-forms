// app/expenses/loading.tsx
export default function ExpensesLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-6 flex flex-col justify-center">
      <div className="max-w-6xl mx-auto w-full px-4">
        <div className="bg-white shadow-xl rounded-3xl overflow-hidden">
          
          {/* Header skeleton */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-white/20 rounded-full"></div>
                <div className="h-6 w-32 bg-white/20 rounded"></div>
              </div>
              <div className="flex space-x-2">
                <div className="h-8 w-24 bg-white/20 rounded-full"></div>
                <div className="h-8 w-24 bg-white/20 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Loading content */}
          <div className="p-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent mb-3"></div>
            <p className="text-gray-600">Cargando tus gastos...</p>
          </div>
        </div>
      </div>
    </div>
  )
}