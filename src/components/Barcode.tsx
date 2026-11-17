import { encode, encodeQr, type BarcodeFormat } from "@/lib/barcode";

/** Streepjescode of QR-code als scherpe SVG (zwart op wit, met witte rand voor de scanner). */
export function Barcode({ value, format, className }: { value: string; format: BarcodeFormat; className?: string }) {
  if (format === "qr") return <QrCode value={value} className={className} />;
  let modules: string;
  try {
    modules = encode(value, format);
  } catch {
    return <p className="text-sm text-danger">Deze barcode kan niet worden getekend.</p>;
  }
  const quiet = 10; // modules wit aan elke kant
  const width = modules.length + quiet * 2;
  const height = Math.round(width * 0.4);
  const bars: { x: number; w: number }[] = [];
  for (let i = 0; i < modules.length; i++) {
    if (modules[i] !== "1") continue;
    let w = 1;
    while (modules[i + w] === "1") w++;
    bars.push({ x: quiet + i, w });
    i += w - 1;
  }
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`Barcode ${value}`}
      preserveAspectRatio="none"
    >
      <rect width={width} height={height} fill="#fff" />
      {bars.map((b) => (
        <rect key={b.x} x={b.x} y={0} width={b.w} height={height} fill="#000" />
      ))}
    </svg>
  );
}

function QrCode({ value, className }: { value: string; className?: string }) {
  let grid: ("0" | "1")[][];
  try {
    grid = encodeQr(value);
  } catch {
    return <p className="text-sm text-danger">Deze QR-code kan niet worden getekend.</p>;
  }
  const quiet = 4;
  const size = grid.length + quiet * 2;
  // Eén pad voor alle zwarte vakjes: klein en scherp
  const d = grid
    .flatMap((row, y) => row.map((v, x) => (v === "1" ? `M${x + quiet},${y + quiet}h1v1h-1z` : "")))
    .join("");
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={className} shapeRendering="crispEdges" role="img" aria-label={`QR-code ${value}`}>
      <rect width={size} height={size} fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  );
}
