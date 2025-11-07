export default function PageHeader({ title, description, actions }) {
  return (
    <div className="page-header relative mb-8 rounded-2xl border border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur shadow-lg shadow-indigo-500/5 px-6 py-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

