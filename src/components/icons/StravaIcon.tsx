import type { CSSProperties } from "react";

export function StravaIcon({
  size = 14,
  className = "",
  style,
}: {
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <img
      src="/strava/icon-96.png"
      alt="Strava"
      width={size}
      height={size}
      className={className}
      style={{ ...style, display: "inline-block" }}
      draggable={false}
    />
  );
}
