import { useEffect } from "react";
import {
  AlertOctagon,
  Calendar,
  DollarSign,
  FastForward,
  Hourglass,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";

interface TimeHorizonScrubberProps {
  currentDay: number;
  onChangeDay: (day: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  speed: 1 | 2 | 5;
  onChangeSpeed: (speed: 1 | 2 | 5) => void;
  cumulativeLossM: number;
  starvingCount: number;
  offlineCount: number;
  onResetDay: () => void;
  className?: string;
}

export function TimeHorizonScrubber({
  currentDay,
  onChangeDay,
  isPlaying,
  onTogglePlay,
  speed,
  onChangeSpeed,
  cumulativeLossM,
  starvingCount,
  offlineCount,
  onResetDay,
  className = "",
}: TimeHorizonScrubberProps) {
  // Playback timer interval
  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = 600 / speed;
    const timer = setInterval(() => {
      onChangeDay(currentDay >= 60 ? 0 : currentDay + 1);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, currentDay, speed, onChangeDay]);

  const milestones = [
    { day: 0, label: "Day 0: Shock" },
    { day: 14, label: "Day 14: Buffers Thin" },
    { day: 30, label: "Day 30: Line Halts" },
    { day: 60, label: "Day 60: DC Outage" },
  ];

  return (
    <div
      className={`rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 shadow-xl shadow-slate-900/5 backdrop-blur-xl ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        {/* Play / Pause / Reset Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlay}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-xs ${
              isPlaying
                ? "bg-amber-500 text-white hover:bg-amber-600"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            {isPlaying ? (
              <Pause className="size-3.5" />
            ) : (
              <Play className="size-3.5 fill-current" />
            )}
            <span>{isPlaying ? "Pause" : "Play Timeline"}</span>
          </button>

          <button
            onClick={onResetDay}
            className="flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            title="Reset to Day 0"
          >
            <RotateCcw className="size-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* Speed Selector */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5">
            {([1, 2, 5] as const).map((s) => (
              <button
                key={s}
                onClick={() => onChangeSpeed(s)}
                className={`rounded-lg px-2 py-0.5 text-[10.5px] font-mono font-bold transition-colors ${
                  speed === s
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Real-time Ticker Metrics */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono">
            <Calendar className="size-3.5 text-indigo-600" />
            <span className="text-slate-500 font-sans">Time:</span>
            <span className="font-bold text-slate-900">Day {currentDay}</span>
            <span className="text-slate-400">/ 60</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/80 px-2.5 py-1 font-mono text-rose-700">
            <DollarSign className="size-3.5 text-rose-600" />
            <span className="font-sans text-[11px] text-rose-600">Loss:</span>
            <span className="font-bold">${cumulativeLossM.toFixed(1)}M</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/80 px-2.5 py-1 font-mono text-amber-700">
            <AlertOctagon className="size-3.5 text-amber-600" />
            <span className="font-sans text-[11px] text-amber-600">Starved:</span>
            <span className="font-bold">{starvingCount} lines</span>
          </div>
        </div>
      </div>

      {/* Scrubber Slider & Timeline Milestones */}
      <div className="mt-3 px-1">
        <div className="relative">
          <input
            id="time-horizon-slider"
            name="timeHorizonSlider"
            aria-label="Simulation day time horizon slider"
            type="range"
            min={0}
            max={60}
            step={1}
            value={currentDay}
            onChange={(e) => onChangeDay(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-indigo-600 focus:outline-none"
          />
        </div>

        <div className="mt-2 flex justify-between text-[10px] font-medium text-slate-500">
          {milestones.map((m) => (
            <button
              key={m.day}
              onClick={() => onChangeDay(m.day)}
              className={`hover:text-indigo-600 transition-colors ${
                currentDay >= m.day ? "text-indigo-600 font-semibold" : ""
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
