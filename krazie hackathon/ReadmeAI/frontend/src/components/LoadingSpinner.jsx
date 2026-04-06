export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-sky via-purple to-pink rounded-full blur-lg opacity-60 animate-spin" style={{animationDuration:'1.2s'}}></div>
        <div className="absolute inset-2 bg-glass rounded-full"></div>
        <div className="absolute inset-2 bg-gradient-to-r from-sky to-purple rounded-full opacity-20 animate-pulse"></div>
      </div>
      <p className="text-lg font-semibold text-slate-200 animate-pulse">
        ✨ AI is generating your README...
      </p>
      <p className="text-sm text-slate-400 mt-2">
        This usually takes 5-10 seconds
      </p>
    </div>
  )
}
