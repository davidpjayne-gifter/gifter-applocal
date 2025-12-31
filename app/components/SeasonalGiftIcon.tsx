export default function SeasonalGiftIcon({
  size = "text-4xl",
  className = "",
}: {
  size?: string;
  className?: string;
}) {
  function getSeasonalEmoji(date = new Date()) {
    const month = date.getMonth() + 1; // 1–12
    const day = date.getDate();

    if (month === 2 && day <= 14) return "❤️";
    if ((month === 3 && day >= 15) || (month === 4 && day <= 15)) return "🐰";
    if (month === 10) return "🎃";
    if (month === 12 && day <= 25) return "🎄";
    return "🎁";
  }

  const icon = getSeasonalEmoji();

  return <div aria-hidden className={`flex justify-center mb-3 ${size} ${className}`}>{icon}</div>;
}
