import { useEffect, useMemo, useRef, useState } from "react";

interface PenFrame {
  name: string;
  html: string;
}

export function PenFrames() {
  const [frames, setFrames] = useState<PenFrame[]>([]);
  const [selected, setSelected] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    fetch("/pen-frames.json")
      .then((response) => response.json())
      .then((data: { frames: PenFrame[] }) => setFrames(data.frames))
      .catch(() => setFrames([]));
  }, []);

  const frame = frames[selected];
  const dimensions = useMemo(() => {
    const match = frame?.html.match(/width:\s*(\d+)px/);
    const heightMatch = frame?.html.match(/height:\s*(\d+)px/);
    return {
      width: match ? Number(match[1]) : 1440,
      height: heightMatch ? Number(heightMatch[1]) : 900,
    };
  }, [frame]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width > 0) setScale(width / dimensions.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [dimensions.width]);

  return (
    <div className="pen-frames">
      <aside className="pen-frames__list">
        {frames.map((item, index) => (
          <button
            key={item.name}
            type="button"
            className={index === selected ? "is-active" : ""}
            onClick={() => setSelected(index)}
          >
            {item.name}
          </button>
        ))}
      </aside>
      <div ref={containerRef} className="pen-frames__stage">
        {frame && (
          <div
            style={{
              width: dimensions.width,
              height: dimensions.height,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              position: "absolute",
              top: 0,
              left: 0,
            }}
            dangerouslySetInnerHTML={{ __html: frame.html }}
          />
        )}
      </div>
    </div>
  );
}
