import { useApp } from '../../context/AppContext';

export function ToastContainer() {
  const { toasts, dismissToast } = useApp();

  return (
    <div className="fixed bottom-4 right-4 z-[60] space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg animate-slide-up min-w-[280px] ${
            toast.type === 'success' ? 'bg-green-500 text-white' :
            toast.type === 'error' ? 'bg-red-500 text-white' :
            toast.type === 'warning' ? 'bg-amber-500 text-white' :
            'bg-blue-500 text-white'
          }`}
        >
          <i className={`fa-solid ${
            toast.type === 'success' ? 'fa-check-circle' :
            toast.type === 'error' ? 'fa-times-circle' :
            toast.type === 'warning' ? 'fa-exclamation-triangle' :
            'fa-info-circle'
          }`}></i>
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => dismissToast(toast.id)}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>
      ))}
    </div>
  );
}
