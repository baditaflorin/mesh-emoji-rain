import { useEffect, useRef, useState } from "react";
import {
  MeshToasts,
  pushToast,
  useEventLog,
  useNamedPeer,
  type MeshConfig,
  type YRoom,
} from "@baditaflorin/mesh-common";

type Props = { room: YRoom | null; config: MeshConfig };

type Drop = {
  id: string;
  peerId: string;
  emoji: string;
  ts: number;
  x: number;
  hue: number;
};

const PALETTE = ["🎉", "❤️", "🔥", "👏", "🌧️", "⭐", "🌈", "💧", "🎈", "🦄", "🍕", "☕"];
const TTL_MS = 5000;
const RATE_LIMIT_MS = 100;

export function Feature({ room, config }: Props) {
  if (!room) {
    return (
      <div className="emoji-screen">
        <h1>emoji rain</h1>
        <p className="emoji-status">Connecting…</p>
      </div>
    );
  }
  return <Body room={room} config={config} />;
}

function Body({ room, config }: { room: YRoom; config: MeshConfig }) {
  const { name, setName, nameOf } = useNamedPeer(config, room);
  const log = useEventLog<Drop>(room, "drops");
  const lastDropAt = useRef(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

  const trimmed = name.trim();
  const live = log.events.filter((d) => d.ts + TTL_MS > now);

  const tap = (emoji: string) => {
    if (!trimmed) return;
    const t = Date.now();
    if (t - lastDropAt.current < RATE_LIMIT_MS) return;
    lastDropAt.current = t;
    const drop: Drop = {
      id: Math.random().toString(36).slice(2, 12),
      peerId: room.peerId,
      emoji,
      ts: t,
      x: Math.random(),
      hue: Math.floor(Math.random() * 360),
    };
    log.push(drop);
    pushToast(room, emoji, { ttl: 3500, peerId: room.peerId });
  };

  const present = room.peerCount + 1;

  return (
    <div className="emoji-screen">
      <MeshToasts room={room} resolveName={nameOf} position="top" />

      <header className="emoji-header">
        <h1>emoji rain</h1>
        <p className="emoji-status">
          {live.length} raining · {present} {present === 1 ? "peer" : "peers"} · {log.size} total
        </p>
      </header>

      <div className="emoji-name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="your name"
          maxLength={48}
          aria-label="your name"
        />
      </div>

      <div className="emoji-palette" role="group" aria-label="tap to rain">
        {PALETTE.map((g) => (
          <button
            key={g}
            type="button"
            className="emoji-key"
            onClick={() => tap(g)}
            disabled={!trimmed}
            aria-label={`rain ${g}`}
          >
            {g}
          </button>
        ))}
      </div>

      {!trimmed && <p className="emoji-hint">enter a name to start raining</p>}

      <div className="emoji-rain-layer" aria-hidden="true">
        {live.map((d) => {
          const age = now - d.ts;
          const fade =
            age < 300 ? age / 300 : age > TTL_MS - 500 ? Math.max(0, (TTL_MS - age) / 500) : 1;
          return (
            <span
              key={d.id}
              className="emoji-drop"
              style={{
                left: `${d.x * 100}%`,
                opacity: fade,
                filter: `drop-shadow(0 0 6px hsl(${d.hue} 90% 60%))`,
              }}
            >
              {d.emoji}
            </span>
          );
        })}
      </div>
    </div>
  );
}
