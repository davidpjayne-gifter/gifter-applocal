export default function SeasonalGiftIcon({
  size = "text-4xl",
  className = "",
}: {
  size?: string;
  className?: string;
}) {
  const month = new Date().getMonth() + 1;

  let icon = "🎁"; // default

  if (month === 2) icon = "❤️"; // February – Valentine’s
  else if (month === 4) icon = "🐣"; // April – Easter
  else if (month === 5) icon = "🌸"; // Spring
  else if (month === 6) icon = "🎓"; // Graduation
  else if (month === 7) icon = "🇺🇸"; // July
  else if (month === 10) icon = "🎃"; // October
  else if (month === 12) icon = "🎄"; // December

  return <div aria-hidden className={`flex justify-center mb-3 ${size} ${className}`}>{icon}</div>;
}
