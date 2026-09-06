/**
 * Masked line reveal. Each line rides up out of its own clip box, staggered by
 * `--i`. Transform only — the mask is a static `overflow:hidden`, not an
 * animated one.
 */
export function Lines({ lines, from = 0 }: { lines: string[]; from?: number }) {
  return (
    <span className="db-lines">
      {lines.map((line, i) => (
        <span
          key={line}
          className="db-line"
          style={{ '--i': from + i } as React.CSSProperties}
        >
          <span>{line}</span>
        </span>
      ))}
    </span>
  );
}

export default Lines;
