// app/expenses/stats/loading.tsx
export default function StatsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-6">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-6">
          
          {/* Header skeleton */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-full"></div>
              <div className="h-6 w-32 bg-white/20 rounded"></div>
            </div>
            <div className="h-8 w-28 bg-white/20 rounded-full"></div>
          </div>

          {/* Main loading area */}
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent mb-4"></div>
              <p className="text-gray-600 font-medium">Cargando tus estadísticas...</p>
            </div>

            {/* Charts skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-100 rounded-xl h-64 animate-pulse"></div>
              <div className="bg-gray-100 rounded-xl h-64 animate-pulse"></div>
              <div className="bg-gray-100 rounded-xl h-64 animate-pulse"></div>
              <div className="bg-gray-100 rounded-xl h-64 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}