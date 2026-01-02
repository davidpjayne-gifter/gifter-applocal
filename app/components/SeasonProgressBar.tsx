type Props = {
  completed: number;
  total: number;
  size?: "default" | "compact";
};

export default function SeasonProgressBar({ completed, total, size = "default" }: Props) {
  const safeTotal = Math.max(total, 1);
  const percent = Math.round((completed / safeTotal) * 100);
  const heightClass = size === "compact" ? "h-1.5" : "h-2";
  const fillClass =
    size === "compact" ? "bg-blue-600 dark:bg-blue-400" : "bg-emerald-500 dark:bg-emerald-400";

  return (
    <div className="w-full">
      <div className={`w-full rounded-full bg-slate-200 dark:bg-slate-800 ${heightClass}`}>
        <div
          className={`rounded-full ${fillClass} ${heightClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
