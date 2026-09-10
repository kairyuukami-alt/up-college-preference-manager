"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Info,
  ListFilter,
  MapPinned,
  Radio,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  getAlertableScheduleEvents,
  getScheduleEventState,
  OFFICIAL_COUNSELLING_SCHEDULES,
  OFFICIAL_SCHEDULE_VERIFIED_AT,
  type OfficialCounsellingSchedule,
  type ScheduleEventState,
} from "@/lib/official-counselling-schedules";

const scheduleThemes: Record<string, { icon: string; border: string; wash: string; dot: string }> = {
  mcc: { icon: "bg-blue-100 text-blue-700", border: "border-t-blue-600", wash: "bg-blue-50/70", dot: "bg-blue-600" },
  haryana: { icon: "bg-violet-100 text-violet-700", border: "border-t-violet-600", wash: "bg-violet-50/70", dot: "bg-violet-600" },
  up: { icon: "bg-red-100 text-red-700", border: "border-t-[#cc0000]", wash: "bg-red-50/70", dot: "bg-[#cc0000]" },
  state: { icon: "bg-cyan-100 text-cyan-800", border: "border-t-cyan-600", wash: "bg-cyan-50/70", dot: "bg-cyan-600" },
  union_territory: { icon: "bg-amber-100 text-amber-800", border: "border-t-amber-500", wash: "bg-amber-50/70", dot: "bg-amber-500" },
};

function themeFor(schedule: OfficialCounsellingSchedule) {
  return scheduleThemes[schedule.id] ?? scheduleThemes[schedule.kind];
}

const stateLabels: Record<ScheduleEventState, string> = {
  completed: "Completed",
  ongoing: "Open now",
  upcoming: "Upcoming",
};

const stateClasses: Record<ScheduleEventState, string> = {
  completed: "border-slate-200 bg-slate-100 text-slate-500",
  ongoing: "border-emerald-200 bg-emerald-50 text-emerald-700",
  upcoming: "border-amber-200 bg-amber-50 text-amber-800",
};

function formatVerifiedAt(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function formatRemaining(target: string, now: number, state: ScheduleEventState) {
  const targetAt = Date.parse(target);
  const difference = Math.max(0, targetAt - now);
  const totalMinutes = Math.ceil(difference / 60_000);
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;
  const pieces = [days ? `${days}d` : "", hours ? `${hours}h` : "", !days && minutes ? `${minutes}m` : ""].filter(Boolean);
  return `${state === "ongoing" ? "Ends" : "Starts"} in ${pieces.join(" ") || "less than a minute"}`;
}

function ScheduleCard({ schedule, now }: { schedule: OfficialCounsellingSchedule; now: number }) {
  const theme = themeFor(schedule);
  return (
    <article className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 border-t-4 bg-white shadow-sm ${theme.border}`}>
      <div className={`border-b border-slate-200 p-5 ${theme.wash}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
          <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${theme.icon}`}><CalendarDays className="size-5" /></span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{schedule.shortName}</p>
            <h3 className="mt-0.5 text-lg font-black leading-tight">{schedule.name}</h3>
            <p className="mt-1 text-xs font-medium leading-5 text-slate-600">{schedule.authority}</p>
          </div>
          </div>
          <Badge className={schedule.coverage === "verified_full" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}>
            {schedule.coverage === "verified_full" ? "Full schedule verified" : "Coordination dates"}
          </Badge>
        </div>
        <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-600">{schedule.notice}</p>
      </div>

      <div className="flex-1">
        {schedule.events.map((event, index) => {
          const state = getScheduleEventState(event, now);
          return (
            <div key={event.id} className="relative grid grid-cols-[1.25rem_1fr] gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0">
              <div className="relative flex justify-center">
                {index < schedule.events.length - 1 && <span className="absolute top-3 h-[calc(100%+1.35rem)] w-px bg-slate-200" />}
                <span className={`relative mt-1 block size-2.5 rounded-full ring-4 ring-white ${state === "completed" ? "bg-slate-300" : theme.dot}`} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">{event.round}</span>
                  <Badge variant="outline" className={`h-5 rounded-md px-1.5 text-[10px] ${event.tentative ? "border-orange-200 bg-orange-50 text-orange-700" : stateClasses[state]}`}>
                    {event.scope === "national_coordination" ? "National window" : event.tentative ? "Tentative" : stateLabels[state]}
                  </Badge>
                </div>
                <p className="mt-1 font-black leading-5 text-slate-900">{event.title}</p>
                <p className="mt-1 text-xs font-bold text-slate-600">{event.dateLabel} IST</p>
                {event.note && <p className="mt-1.5 text-xs leading-5 text-slate-500">{event.note}</p>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
        {schedule.sources.map((source) => (
          <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-[#cc0000]">
            {source.label}<ExternalLink className="size-3" />
          </a>
        ))}
      </div>
    </article>
  );
}

export function OfficialCounsellingSchedules({ compact = false }: { compact?: boolean }) {
  const [now, setNow] = useState(() => Date.parse(OFFICIAL_SCHEDULE_VERIFIED_AT));
  const [selectedId, setSelectedId] = useState("mcc");

  useEffect(() => {
    // Keep deadline states and countdowns fresh without requiring a page reload.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const alerts = useMemo(() => getAlertableScheduleEvents(now).slice(0, compact ? 2 : 4), [compact, now]);
  const hasOngoing = alerts.some((item) => item.state === "ongoing");
  const selectedSchedule = OFFICIAL_COUNSELLING_SCHEDULES.find((schedule) => schedule.id === selectedId) ?? OFFICIAL_COUNSELLING_SCHEDULES[0];
  const selectedDeadlines = useMemo(() => selectedSchedule.events
    .map((event) => ({ event, state: getScheduleEventState(event, now) }))
    .filter(({ state }) => state !== "completed")
    .sort((a, b) => Date.parse(a.event.startAt) - Date.parse(b.event.startAt))
    .slice(0, 3), [now, selectedSchedule]);
  const states = OFFICIAL_COUNSELLING_SCHEDULES.filter((schedule) => schedule.kind === "state").sort((a, b) => a.shortName.localeCompare(b.shortName));
  const unionTerritories = OFFICIAL_COUNSELLING_SCHEDULES.filter((schedule) => schedule.kind === "union_territory").sort((a, b) => a.shortName.localeCompare(b.shortName));

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100/70 shadow-sm" aria-labelledby="official-schedule-title">
      <div className="border-b border-slate-200 bg-[#172033] px-5 py-5 text-white sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.17em] text-slate-300"><ShieldCheck className="size-4 text-red-400" /> Verified official notices</p>
            <h2 id="official-schedule-title" className="mt-1 text-2xl font-black">All-India NEET UG schedule board</h2>
            <p className="mt-1 text-sm text-slate-300">MCC, every state and Union Territory • Select an authority to see its complete available timeline</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-right">
            <p className="flex items-center justify-end gap-1.5 text-xs font-bold text-emerald-300"><Radio className="size-3.5" /> Official pages checked hourly</p>
            <p className="mt-1 text-[11px] text-slate-300">Countdowns refresh every minute • Synced {formatVerifiedAt(OFFICIAL_SCHEDULE_VERIFIED_AT)}</p>
          </div>
        </div>

        <div className={`mt-5 grid gap-3 ${compact ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-4"}`} aria-live="polite">
          {alerts.map(({ schedule, event, state }) => {
            const difference = (Date.parse(state === "ongoing" ? event.endAt : event.startAt) - now) / 3_600_000;
            const urgent = state === "ongoing" && difference <= 24;
            return (
              <div key={`${schedule.id}-${event.id}`} className={`rounded-xl border p-3.5 ${urgent ? "border-red-400/50 bg-red-500/15" : state === "ongoing" ? "border-emerald-400/40 bg-emerald-400/10" : "border-white/10 bg-white/5"}`}>
                <div className="flex items-center gap-2">
                  {urgent ? <BellRing className="size-4 shrink-0 text-red-300" /> : state === "ongoing" ? <Clock3 className="size-4 shrink-0 text-emerald-300" /> : <CalendarDays className="size-4 shrink-0 text-amber-300" />}
                  <p className="text-xs font-black uppercase tracking-wide text-slate-200">{schedule.shortName} • {event.round}</p>
                </div>
                <p className="mt-2 font-black leading-5">{event.title}</p>
                <p className={`mt-1 text-xs font-bold ${urgent ? "text-red-200" : state === "ongoing" ? "text-emerald-200" : "text-amber-200"}`}>{formatRemaining(state === "ongoing" ? event.endAt : event.startAt, now, state)}</p>
              </div>
            );
          })}
          {!alerts.length && <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300"><CheckCircle2 className="mb-2 size-5 text-emerald-300" />No active or upcoming published event.</div>}
        </div>
        {!hasOngoing && alerts.length > 0 && <p className="mt-3 flex items-center gap-2 text-xs text-slate-300"><Info className="size-3.5" /> No event is open right now, so the next published events are shown.</p>}
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="Choose a counselling schedule">
          <div className="grid items-end gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
            <label htmlFor="official-schedule-select" className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-black text-slate-800"><ListFilter className="size-4 text-[#cc0000]" /> Select MCC, state or Union Territory</span>
              <select id="official-schedule-select" value={selectedSchedule.id} onChange={(event) => setSelectedId(event.target.value)} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base font-bold text-slate-900 outline-none transition focus:border-[#cc0000] focus:ring-4 focus:ring-red-100">
                <optgroup label="National counselling">
                  <option value="mcc">MCC — All India Quota, Deemed &amp; Central Universities</option>
                </optgroup>
                <optgroup label="State counselling authorities">
                  {states.map((schedule) => <option key={schedule.id} value={schedule.id}>{schedule.shortName}</option>)}
                </optgroup>
                <optgroup label="Union Territory counselling authorities">
                  {unionTerritories.map((schedule) => <option key={schedule.id} value={schedule.id}>{schedule.shortName}</option>)}
                </optgroup>
              </select>
            </label>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Badge variant="outline" className="h-8 px-3 text-xs"><MapPinned /> {OFFICIAL_COUNSELLING_SCHEDULES.length} authorities</Badge>
              <Badge variant="outline" className="h-8 px-3 text-xs">{selectedSchedule.region}</Badge>
              <Badge className={`h-8 px-3 text-xs ${selectedSchedule.coverage === "verified_full" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
                {selectedSchedule.coverage === "verified_full" ? "State-specific dates verified" : "Official coordination dates only"}
              </Badge>
            </div>
          </div>
        </section>

        <section aria-label={`${selectedSchedule.shortName} active deadlines`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div><p className="text-xs font-black uppercase tracking-[0.14em] text-[#cc0000]">Selected counselling</p><h3 className="text-xl font-black">Current and next deadlines</h3></div>
            <p className="text-xs font-semibold text-slate-500">Times shown in IST</p>
          </div>
          {selectedDeadlines.length ? <div className="grid gap-3 md:grid-cols-3">{selectedDeadlines.map(({ event, state }) => (
            <div key={event.id} className={`rounded-2xl border p-4 ${state === "ongoing" ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
              <div className="flex items-center justify-between gap-2"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{event.round}</p><Badge variant="outline" className={stateClasses[state]}>{event.scope === "national_coordination" ? "Coordination" : stateLabels[state]}</Badge></div>
              <p className="mt-2 font-black leading-5 text-slate-900">{event.title}</p>
              <p className="mt-2 text-sm font-bold text-slate-700">{event.dateLabel} IST</p>
              <p className={`mt-1 text-xs font-black ${state === "ongoing" ? "text-emerald-700" : "text-amber-800"}`}>{formatRemaining(state === "ongoing" ? event.endAt : event.startAt, now, state)}</p>
            </div>
          ))}</div> : <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600"><CheckCircle2 className="mb-2 size-5 text-emerald-600" />No further published deadline is available for this counselling.</div>}
        </section>

        <ScheduleCard schedule={selectedSchedule} now={now} />
      </div>
      <p className="border-t border-slate-200 bg-white px-5 py-3 text-xs leading-5 text-slate-500">Green “Full schedule verified” entries contain state-specific published dates. Amber “Coordination dates” entries show only MCC’s national State-counselling window until that authority’s complete schedule is verified. Always open the linked official notice before payment, choice locking, verification or travel.</p>
    </section>
  );
}
