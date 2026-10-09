import { useMemo } from "react";
import { mapPaths, samples } from "./route";
import type { Route } from "./route";

export function Atlas({
  routes,
  active,
  from,
  to,
  onSelect,
}: {
  routes: Route[];
  active: string;
  from: number;
  to: number;
  onSelect: (id: string) => void;
}) {
  const paths = useMemo(() => mapPaths(routes), [routes]);

  return (
    <div className="atlas">
      <svg
        viewBox="0 0 960 450"
        role="img"
        aria-label="Schematic route comparison map; decorative contours are not real terrain"
      >
        <defs>
          <pattern id="paper" width="60" height="60" patternUnits="userSpaceOnUse">
            <path
              d="M-10 20 Q15 0 40 20 T90 20 M-10 30 Q15 10 40 30 T90 30 M-10 40 Q15 20 40 40 T90 40"
              fill="none"
              stroke="#d5d5c4"
              strokeWidth=".65"
            />
          </pattern>
        </defs>
        <rect width="960" height="450" fill="url(#paper)" />
        <path
          d="M100 450 Q360 240 300 0 M850 450 Q700 220 890 0"
          stroke="#c5d9d2"
          strokeWidth="3"
          fill="none"
          opacity=".6"
        />
        {paths.map(({ route, coords, path }) => (
          <g key={route.id} onClick={() => onSelect(route.id)} className="map-route">
            <path
              d={path}
              stroke={route.color}
              strokeWidth={route.id === active ? 4 : 3}
              fill="none"
              opacity={route.id === active ? 1 : 0.75}
            />
            {coords.map((p, i) =>
              i > 0 && !p.breakBefore && p.km >= from && coords[i - 1].km <= to ? (
                <path
                  key={i}
                  d={`M${coords[i - 1].x},${coords[i - 1].y}L${p.x},${p.y}`}
                  stroke={route.color}
                  strokeWidth="8"
                  opacity=".33"
                />
              ) : null,
            )}
            {coords
              .filter((_, i) => i % 20 === 0)
              .map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="4.5" fill={route.color} />
              ))}
            <circle
              cx={coords[0].x}
              cy={coords[0].y}
              r="9"
              stroke={route.color}
              strokeWidth="3"
              fill="#f6f4e9"
            />
            <circle cx={coords[0].x} cy={coords[0].y} r="4" fill={route.color} />
          </g>
        ))}
        <g transform="translate(918 30)" fill="#243c32">
          <path d="M0 -16 7 7 0 2 -7 7Z" />
          <text x="0" y="25" textAnchor="middle" fontSize="16">
            N
          </text>
        </g>
      </svg>
      <span className="map-note">Schematic coordinates · decorative contours</span>
    </div>
  );
}

export function Profile({
  route,
  from,
  to,
  maximum,
}: {
  route: Route;
  from: number;
  to: number;
  maximum: number;
}) {
  const data = samples(route.points);
  const known = data.flatMap((p) => (p.ele === undefined ? [] : [p.ele]));

  const low = known.length ? Math.floor(Math.min(...known) / 100) * 100 : 0;

  const high = known.length ? Math.ceil(Math.max(...known) / 100) * 100 + 30 : 1;

  const x = (km: number) => 55 + (km / maximum) * 865;
  const y = (ele: number) => 128 - ((ele - low) / (high - low)) * 95;
  let pen = false;

  const path = data
    .map((p) => {
      if (p.ele === undefined) {
        pen = false;

        return "";
      }

      const part = `${pen && !p.breakBefore ? "L" : "M"}${x(p.km)},${y(p.ele)}`;
      pen = true;

      return part;
    })
    .join(" ");

  return (
    <div className="profile">
      <h3>
        <i style={{ background: route.color }} />
        {route.name}
      </h3>
      {!known.length ? (
        <div className="missing">
          This route has no elevation data. Distance and map are available.
        </div>
      ) : (
        <svg viewBox="0 0 960 155" role="img" aria-label={`${route.name} elevation profile`}>
          {[0, 0.5, 1].map((f, i) => (
            <g key={i}>
              <path d={`M55 ${128 - f * 95}H930`} stroke="#dcddce" />
              <text x="45" y={132 - f * 95} textAnchor="end" fontSize="12" fill="#637468">
                {Math.round(low + f * (high - low))} m
              </text>
            </g>
          ))}
          {Array.from({ length: Math.ceil(maximum) + 1 }, (_, i) => (
            <g key={i}>
              <path d={`M${x(i)} 30V128`} stroke="#e4e4d8" />
              <text x={x(i)} y="149" textAnchor="middle" fontSize="12" fill="#637468">
                {i}
              </text>
            </g>
          ))}
          <rect
            x={x(Math.min(from, maximum))}
            y="28"
            width={Math.max(0, x(Math.min(to, maximum)) - x(Math.min(from, maximum)))}
            height="100"
            fill={route.color}
            opacity=".1"
          />
          <path d={path} stroke={route.color} strokeWidth="2.5" fill="none" />
          <path
            d={`M${x(from)} 28V130 M${x(to)} 28V130`}
            stroke={route.color}
            strokeDasharray="5 4"
          />
        </svg>
      )}
    </div>
  );
}
