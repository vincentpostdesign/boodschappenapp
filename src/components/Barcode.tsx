import { encode, type BarcodeFormat } from "@/lib/barcode";

/** Barcode als scherpe SVG (zwart op wit, met stille zone links en rechts voor de scanner). */
export function Barcode({ value, format, className }: { value: string; format: BarcodeFormat; className?: string }) {
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
