// 迷你走勢圖（SVG 折線），用於市場指數
export default function Sparkline({ data = [], width = 120, height = 36, color = '#F59E0B' }) {
  if (!data || data.length < 2) {
    return <svg width={width} height={height} />;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / span) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const up = data[data.length - 1] >= data[0];
  const stroke = color || (up ? '#22c55e' : '#ef4444');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
