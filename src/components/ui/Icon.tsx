// Set d'icônes minimalistes maison (traits, pas d'emoji) — même logique que
// src/components/Icons.tsx dans PPL Tracker. Un seul composant, un nom, une couleur.
import React from "react";
import Svg, { Path, Circle, Line, Rect, Polyline } from "react-native-svg";

export type IconName =
  | "dashboard"
  | "notes"
  | "timetable"
  | "homework"
  | "settings"
  | "chevronRight"
  | "chevronLeft"
  | "chevronDown"
  | "chevronUp"
  | "close"
  | "check"
  | "checkCircle"
  | "circle"
  | "plus"
  | "palette"
  | "sun"
  | "moon"
  | "device"
  | "lock"
  | "user"
  | "eye"
  | "eyeOff"
  | "refresh"
  | "warning"
  | "book"
  | "clock"
  | "pin"
  | "grip"
  | "sparkle"
  | "school"
  | "bell"
  | "text"
  | "backpack"
  | "target"
  | "chat"
  | "megaphone";

type Props = {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
};

export function Icon({ name, size = 22, color, strokeWidth = 1.8 }: Props) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none" as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === "dashboard" && (
        <>
          <Rect x="3" y="3" width="7.5" height="9" rx="2" {...common} />
          <Rect x="13.5" y="3" width="7.5" height="5.5" rx="2" {...common} />
          <Rect x="13.5" y="11" width="7.5" height="10" rx="2" {...common} />
          <Rect x="3" y="14.5" width="7.5" height="6.5" rx="2" {...common} />
        </>
      )}
      {name === "notes" && (
        <>
          <Line x1="4" y1="20" x2="4" y2="12" {...common} />
          <Line x1="10" y1="20" x2="10" y2="6" {...common} />
          <Line x1="16" y1="20" x2="16" y2="15" {...common} />
          <Line x1="21" y1="20" x2="21" y2="9" {...common} />
        </>
      )}
      {name === "timetable" && (
        <>
          <Rect x="3" y="4.5" width="18" height="16" rx="2.5" {...common} />
          <Line x1="3" y1="9.5" x2="21" y2="9.5" {...common} />
          <Line x1="8" y1="2.5" x2="8" y2="6.5" {...common} />
          <Line x1="16" y1="2.5" x2="16" y2="6.5" {...common} />
        </>
      )}
      {name === "homework" && (
        <>
          <Rect x="4.5" y="3" width="15" height="18" rx="2.5" {...common} />
          <Polyline points="8.5,12 10.5,14 15.5,9" {...common} />
        </>
      )}
      {name === "settings" && (
        <>
          <Circle cx="12" cy="12" r="3.2" {...common} />
          <Path
            d="M12 3.2v2.1M12 18.7v2.1M20.8 12h-2.1M5.3 12H3.2M18 6l-1.5 1.5M7.5 16.5L6 18M18 18l-1.5-1.5M7.5 7.5L6 6"
            {...common}
          />
        </>
      )}
      {name === "chevronRight" && <Polyline points="9,5 16,12 9,19" {...common} />}
      {name === "chevronLeft" && <Polyline points="15,5 8,12 15,19" {...common} />}
      {name === "chevronDown" && <Polyline points="5,9 12,16 19,9" {...common} />}
      {name === "chevronUp" && <Polyline points="5,15 12,8 19,15" {...common} />}
      {name === "close" && (
        <>
          <Line x1="6" y1="6" x2="18" y2="18" {...common} />
          <Line x1="18" y1="6" x2="6" y2="18" {...common} />
        </>
      )}
      {name === "check" && <Polyline points="5,13 10,18 19,7" {...common} />}
      {name === "checkCircle" && (
        <>
          <Circle cx="12" cy="12" r="9" {...common} />
          <Polyline points="8,12.5 11,15.5 16,9" {...common} />
        </>
      )}
      {name === "circle" && <Circle cx="12" cy="12" r="9" {...common} />}
      {name === "plus" && (
        <>
          <Line x1="12" y1="5" x2="12" y2="19" {...common} />
          <Line x1="5" y1="12" x2="19" y2="12" {...common} />
        </>
      )}
      {name === "palette" && (
        <>
          <Path
            d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-2 0-.6-.3-1-.6-1.4-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H16a4.5 4.5 0 0 0 4.5-4.5C20.5 6 16.9 3 12 3Z"
            {...common}
          />
          <Circle cx="7.5" cy="11" r="1.1" stroke="none" fill={color} />
          <Circle cx="9.5" cy="7" r="1.1" stroke="none" fill={color} />
          <Circle cx="14.5" cy="7" r="1.1" stroke="none" fill={color} />
        </>
      )}
      {name === "sun" && (
        <>
          <Circle cx="12" cy="12" r="4.2" {...common} />
          <Path
            d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6M18.4 18.4l-1.6-1.6M7.2 7.2 5.6 5.6"
            {...common}
          />
        </>
      )}
      {name === "moon" && (
        <Path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" {...common} />
      )}
      {name === "device" && (
        <>
          <Rect x="6" y="2.5" width="12" height="19" rx="2.5" {...common} />
          <Line x1="10.5" y1="18.3" x2="13.5" y2="18.3" {...common} />
        </>
      )}
      {name === "lock" && (
        <>
          <Rect x="4.5" y="10.5" width="15" height="10" rx="2.2" {...common} />
          <Path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" {...common} />
        </>
      )}
      {name === "user" && (
        <>
          <Circle cx="12" cy="8" r="3.4" {...common} />
          <Path d="M4.8 20c1-3.6 4-5.6 7.2-5.6s6.2 2 7.2 5.6" {...common} />
        </>
      )}
      {name === "eye" && (
        <>
          <Path d="M2.5 12s3.6-6.5 9.5-6.5S21.5 12 21.5 12 17.9 18.5 12 18.5 2.5 12 2.5 12Z" {...common} />
          <Circle cx="12" cy="12" r="2.6" {...common} />
        </>
      )}
      {name === "eyeOff" && (
        <>
          <Path d="M3.5 3.5l17 17" {...common} />
          <Path
            d="M6.2 6.6C4 8.1 2.5 12 2.5 12S6.1 18.5 12 18.5c1.7 0 3.2-.4 4.5-1.1M9.9 5.7c.7-.1 1.4-.2 2.1-.2 5.9 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3 3.9"
            {...common}
          />
          <Path d="M9.9 12a2.6 2.6 0 0 0 3.7 2.5" {...common} />
        </>
      )}
      {name === "refresh" && (
        <>
          <Path d="M4 12a8 8 0 0 1 13.7-5.7L20 8.5" {...common} />
          <Polyline points="20,4 20,8.5 15.5,8.5" {...common} />
          <Path d="M20 12a8 8 0 0 1-13.7 5.7L4 15.5" {...common} />
          <Polyline points="4,20 4,15.5 8.5,15.5" {...common} />
        </>
      )}
      {name === "warning" && (
        <>
          <Path d="M12 3.5 21.5 20h-19L12 3.5Z" {...common} />
          <Line x1="12" y1="9.5" x2="12" y2="14" {...common} />
          <Circle cx="12" cy="17" r="0.9" stroke="none" fill={color} />
        </>
      )}
      {name === "book" && (
        <>
          <Path d="M5 4.5h9.5a2 2 0 0 1 2 2V20H7a2 2 0 0 1-2-2V4.5Z" {...common} />
          <Line x1="5" y1="17.5" x2="16.5" y2="17.5" {...common} />
        </>
      )}
      {name === "clock" && (
        <>
          <Circle cx="12" cy="12" r="9" {...common} />
          <Polyline points="12,7 12,12.5 16,14.5" {...common} />
        </>
      )}
      {name === "pin" && (
        <>
          <Path d="M12 21s-6.5-6-6.5-11.5a6.5 6.5 0 1 1 13 0C18.5 15 12 21 12 21Z" {...common} />
          <Circle cx="12" cy="9.5" r="2.3" {...common} />
        </>
      )}
      {name === "grip" && (
        <>
          <Circle cx="9" cy="6" r="1" stroke="none" fill={color} />
          <Circle cx="15" cy="6" r="1" stroke="none" fill={color} />
          <Circle cx="9" cy="12" r="1" stroke="none" fill={color} />
          <Circle cx="15" cy="12" r="1" stroke="none" fill={color} />
          <Circle cx="9" cy="18" r="1" stroke="none" fill={color} />
          <Circle cx="15" cy="18" r="1" stroke="none" fill={color} />
        </>
      )}
      {name === "sparkle" && (
        <Path
          d="M12 2.5 13.7 9l6.3 1.7-6.3 1.8L12 19l-1.7-6.5L4 10.7 10.3 9 12 2.5Z"
          {...common}
          strokeLinejoin="round"
        />
      )}
      {name === "school" && (
        <>
          <Path d="M12 3 2 8l10 5 10-5-10-5Z" {...common} />
          <Path d="M6 10.5V16c0 1.2 2.7 3 6 3s6-1.8 6-3v-5.5" {...common} />
        </>
      )}
      {name === "bell" && (
        <>
          <Path d="M6 10a6 6 0 0 1 12 0c0 4.5 1.6 6 1.6 6H4.4S6 14.5 6 10Z" {...common} />
          <Path d="M10 19a2 2 0 0 0 4 0" {...common} />
        </>
      )}
      {name === "text" && (
        <>
          <Line x1="5" y1="6.5" x2="19" y2="6.5" {...common} />
          <Line x1="5" y1="12" x2="19" y2="12" {...common} />
          <Line x1="5" y1="17.5" x2="13" y2="17.5" {...common} />
        </>
      )}
      {name === "backpack" && (
        <>
          <Path d="M7 9V6.5a5 5 0 0 1 10 0V9" {...common} />
          <Path d="M5.5 9h13a1.5 1.5 0 0 1 1.5 1.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8.5A1.5 1.5 0 0 1 5.5 9Z" {...common} />
          <Line x1="9" y1="13" x2="15" y2="13" {...common} />
          <Path d="M9 21v-5h6v5" {...common} />
        </>
      )}
      {name === "target" && (
        <>
          <Circle cx="12" cy="12" r="8.5" {...common} />
          <Circle cx="12" cy="12" r="5" {...common} />
          <Circle cx="12" cy="12" r="1.4" stroke="none" fill={color} />
        </>
      )}
      {name === "chat" && (
        <Path
          d="M4 5.5h16a1 1 0 0 1 1 1V15a1 1 0 0 1-1 1H9l-4.5 4V16H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z"
          {...common}
        />
      )}
      {name === "megaphone" && (
        <>
          <Path d="M3 10v4a1.2 1.2 0 0 0 1.2 1.2H6l1 5h2l-1-5h1l9 4V6l-9 4H4.2A1.2 1.2 0 0 0 3 10Z" {...common} />
          <Path d="M19 9v6" {...common} />
        </>
      )}
    </Svg>
  );
}
