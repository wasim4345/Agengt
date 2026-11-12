"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { addDays, format, max as maxDateFn, min as minDateFn, parseISO } from "date-fns";
import {
  Badge,
  Button,
  useToast,
} from "@/components/ui";
import {
  effectiveEnd,
  effectiveStart,
  validateAddDependency,
  validateSchedule,
  wouldCreateCycle,
} from "@/lib/rules/dependencies";
import { collectUpstreamDownstream } from "@/store/actions/gantt";
import { useOsStore } from "@/store/store";
import type { DepType, ID, ISODate } from "@/types/domain";
import { ImpactPanel } from "./ImpactPanel";
import {
  DAY_WIDTH,
  HEADER_HEIGHT,
  LEFT_WIDTH,
  MILESTONE_ROW_HEIGHT,
  ROW_HEIGHT,
  buildTicks,
  dayIndex,
  snapDaysDelta,
  statusBarClass,
  type GanttZoom,
} from "./scale";

type DragMode = "move" | "resize-start" | "resize-end" | "link" | null;

type DragState = {
  mode: DragMode;
  activityId: ID;
  originX: number;
  startDate: ISODate;
  endDate: ISODate;
  previewStart: ISODate;
  previewEnd: ISODate;
  linkX?: number;
  linkY?: number;
};

export function GanttChart({
  programmeId,
  compact = false,
}: {
  programmeId: ID;
  compact?: boolean;
}) {
  const state = useOsStore((s) => s.state);
  const rescheduleActivity = useOsStore((s) => s.rescheduleActivity);
  const nudgeActivity = useOsStore((s) => s.nudgeActivity);
  const addDependency = useOsStore((s) => s.addDependency);
  const undo = useOsStore((s) => s.undo);
  const updateActivity = useOsStore((s) => s.updateActivity);
  const { push } = useToast();

  const programme = state.programmes[programmeId];
  const [zoom, setZoom] = useState<GanttZoom>("month");
  const [showDeps, setShowDeps] = useState(true);
  const [showBaseline, setShowBaseline] = useState(true);
  const [showMilestones, setShowMilestones] = useState(true);
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [selectedId, setSelectedId] = useState<ID | null>(null);
  const [impactSource, setImpactSource] = useState<ID | null>(null);
  const [highlightDown, setHighlightDown] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    activityId: ID;
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const dayW = DAY_WIDTH[zoom];

  const activities = useMemo(() => {
    let list = Object.values(state.activities).filter(
      (a) => a.programmeId === programmeId,
    );
    if (groupByCategory) {
      list = [...list].sort((a, b) =>
        (a.categoryId ?? "").localeCompare(b.categoryId ?? "") ||
        a.sortOrder - b.sortOrder,
      );
    } else {
      list = [...list].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return list;
  }, [state.activities, programmeId, groupByCategory]);

  const milestones = useMemo(
    () =>
      Object.values(state.milestones)
        .filter((m) => m.programmeId === programmeId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [state.milestones, programmeId],
  );

  const deps = useMemo(
    () =>
      Object.values(state.dependencies).filter(
        (d) => d.programmeId === programmeId,
      ),
    [state.dependencies, programmeId],
  );

  const range = useMemo(() => {
    if (!programme) {
      return { start: state.meta.demoDate, end: state.meta.demoDate };
    }
    const dates: Date[] = [
      parseISO(programme.startDate),
      parseISO(programme.endDate),
      parseISO(state.meta.demoDate),
    ];
    for (const a of activities) {
      dates.push(parseISO(effectiveStart(a)), parseISO(effectiveEnd(a)));
      if (a.baselineStart) dates.push(parseISO(a.baselineStart));
      if (a.baselineEnd) dates.push(parseISO(a.baselineEnd));
    }
    for (const m of milestones) dates.push(parseISO(m.targetDate));
    const start = format(addDays(minDateFn(dates), -7), "yyyy-MM-dd");
    const end = format(addDays(maxDateFn(dates), 14), "yyyy-MM-dd");
    return { start, end };
  }, [programme, activities, milestones, state.meta.demoDate]);

  const totalDays = Math.max(1, dayIndex(range.start, range.end));
  const canvasWidth = totalDays * dayW;
  const bodyHeight =
    activities.length * ROW_HEIGHT +
    (showMilestones ? MILESTONE_ROW_HEIGHT : 0);

  const violations = useMemo(
    () =>
      new Set(
        validateSchedule(state, programmeId).map((v) => v.activityId),
      ),
    [state, programmeId],
  );

  const { upstream, downstream } = useMemo(() => {
    if (!selectedId) return { upstream: new Set<ID>(), downstream: new Set<ID>() };
    return collectUpstreamDownstream(state, selectedId);
  }, [state, selectedId]);

  const impactTargets = useMemo(() => {
    const set = new Set<ID>();
    if (!impactSource) return set;
    for (const i of Object.values(state.delayImpacts)) {
      if (i.sourceActivityId === impactSource && i.status === "proposed") {
        set.add(i.affectedActivityId);
      }
    }
    return set;
  }, [state.delayImpacts, impactSource]);

  const ticks = useMemo(
    () => buildTicks(range.start, range.end, zoom),
    [range.start, range.end, zoom],
  );

  const xFor = useCallback(
    (date: ISODate) => dayIndex(range.start, date) * dayW,
    [range.start, dayW],
  );

  const commitReschedule = useCallback(
    (activityId: ID, start: ISODate, end: ISODate) => {
      const r = rescheduleActivity(activityId, start, end);
      if (!r.ok) {
        push({
          title: r.errors[0]?.message ?? "Reschedule failed",
          tone: "danger",
        });
        return;
      }
      const act = state.activities[activityId];
      push({
        title: `Moved ${act?.code ?? "activity"}`,
        description:
          r.data.impacts.length > 0
            ? `${r.data.impacts.length} downstream shift(s) proposed`
            : undefined,
        tone: "success",
        undoLabel: "Undo",
        onUndo: () => {
          undo();
          setImpactSource(null);
        },
      });
      if (r.data.impacts.length > 0) {
        setImpactSource(activityId);
        setHighlightDown(true);
      } else {
        setImpactSource(null);
      }
    },
    [rescheduleActivity, push, state.activities, undo],
  );

  // Keyboard nudge
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!selectedId) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const days = e.key === "ArrowLeft" ? -1 : 1;
        const r = nudgeActivity(selectedId, days);
        if (!r.ok) {
          push({
            title: r.errors[0]?.message ?? "Nudge failed",
            tone: "danger",
          });
          return;
        }
        push({
          title: `Nudged ${days > 0 ? "+" : ""}${days} day`,
          undoLabel: "Undo",
          onUndo: () => {
            undo();
            setImpactSource(null);
          },
          tone: "success",
        });
        if (r.data.impacts.length > 0) {
          setImpactSource(selectedId);
          setHighlightDown(true);
        }
      }
      if (e.key === "Escape") {
        setSelectedId(null);
        setMenu(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, nudgeActivity, push, undo]);

  function onBarPointerDown(
    e: ReactPointerEvent,
    activityId: ID,
    mode: DragMode,
  ) {
    e.preventDefault();
    e.stopPropagation();
    const activity = state.activities[activityId];
    if (!activity || !mode) return;
    setSelectedId(activityId);
    setMenu(null);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDrag({
      mode,
      activityId,
      originX: e.clientX,
      startDate: effectiveStart(activity),
      endDate: effectiveEnd(activity),
      previewStart: effectiveStart(activity),
      previewEnd: effectiveEnd(activity),
      linkX: e.clientX,
      linkY: e.clientY,
    });
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!drag) return;
    if (drag.mode === "link") {
      setDrag({ ...drag, linkX: e.clientX, linkY: e.clientY });
      return;
    }
    const delta = snapDaysDelta(e.clientX - drag.originX, zoom);
    let previewStart = drag.startDate;
    let previewEnd = drag.endDate;
    if (drag.mode === "move") {
      previewStart = format(
        addDays(parseISO(drag.startDate), delta),
        "yyyy-MM-dd",
      );
      previewEnd = format(
        addDays(parseISO(drag.endDate), delta),
        "yyyy-MM-dd",
      );
    } else if (drag.mode === "resize-end") {
      previewEnd = format(
        addDays(parseISO(drag.endDate), delta),
        "yyyy-MM-dd",
      );
      if (previewEnd < previewStart) previewEnd = previewStart;
    } else if (drag.mode === "resize-start") {
      previewStart = format(
        addDays(parseISO(drag.startDate), delta),
        "yyyy-MM-dd",
      );
      if (previewStart > previewEnd) previewStart = previewEnd;
    }
    setDrag({ ...drag, previewStart, previewEnd });
  }

  function onPointerUp(e: ReactPointerEvent) {
    if (!drag) return;
    if (drag.mode === "link") {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const targetId = el
        ?.closest("[data-gantt-activity]")
        ?.getAttribute("data-gantt-activity");
      if (targetId && targetId !== drag.activityId) {
        const cycle = wouldCreateCycle(
          state,
          programmeId,
          `activity:${drag.activityId}`,
          `activity:${targetId}`,
        );
        if (cycle.hasCycle) {
          push({
            title: `Cannot link — cycle: ${cycle.path}`,
            tone: "danger",
          });
        } else {
          const check = validateAddDependency(state, {
            programmeId,
            successorId: targetId,
            predecessorId: drag.activityId,
          });
          if (!check.ok) {
            push({
              title: check.errors[0]?.message ?? "Link rejected",
              tone: "danger",
            });
          } else {
            const r = addDependency({
              programmeId,
              successorId: targetId,
              predecessorId: drag.activityId,
              type: "FS" as DepType,
            });
            push({
              title: r.ok ? "Dependency linked" : (r.errors[0]?.message ?? "Failed"),
              tone: r.ok ? "success" : "danger",
              undoLabel: r.ok ? "Undo" : undefined,
              onUndo: r.ok ? () => undo() : undefined,
            });
          }
        }
      }
      setDrag(null);
      return;
    }

    const changed =
      drag.previewStart !== drag.startDate ||
      drag.previewEnd !== drag.endDate;
    if (changed) {
      commitReschedule(drag.activityId, drag.previewStart, drag.previewEnd);
    }
    setDrag(null);
  }

  if (!programme) {
    return (
      <p className="text-sm text-muted">Programme not found for Gantt.</p>
    );
  }

  const todayX = xFor(state.meta.demoDate);
  const rowIndex = new Map(activities.map((a, i) => [a.id, i]));

  function barStyle(activityId: ID) {
    const activity = state.activities[activityId]!;
    const isDragging = drag?.activityId === activityId;
    const start = isDragging ? drag!.previewStart : effectiveStart(activity);
    const end = isDragging ? drag!.previewEnd : effectiveEnd(activity);
    const left = xFor(start);
    const width = Math.max(dayW, (dayIndex(start, end) + 1) * dayW);
    return { left, width, start, end };
  }

  function highlightClass(id: ID): string {
    if (impactTargets.has(id) || (highlightDown && downstream.has(id))) {
      return "ring-2 ring-orange-500";
    }
    if (selectedId && upstream.has(id)) return "ring-2 ring-sky-500";
    if (selectedId === id) return "ring-2 ring-primary";
    if (violations.has(id)) return "outline outline-dashed outline-amber-500";
    return "";
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-border p-0.5">
          {(["week", "month", "quarter"] as GanttZoom[]).map((z) => (
            <Button
              key={z}
              size="sm"
              variant={zoom === z ? "primary" : "ghost"}
              onClick={() => setZoom(z)}
            >
              {z[0]!.toUpperCase() + z.slice(1)}
            </Button>
          ))}
        </div>
        {(
          [
            ["Dependencies", showDeps, setShowDeps],
            ["Baseline", showBaseline, setShowBaseline],
            ["Milestones", showMilestones, setShowMilestones],
            ["Group by category", groupByCategory, setGroupByCategory],
          ] as const
        ).map(([label, on, set]) => (
          <label key={label} className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={on}
              onChange={(e) => set(e.target.checked)}
            />
            {label}
          </label>
        ))}
        <Badge tone="neutral">{activities.length} activities</Badge>
      </div>

      <div
        className={`overflow-hidden rounded-xl border border-border bg-surface ${
          compact ? "max-h-[28rem]" : "max-h-[70vh]"
        }`}
      >
        <div className="flex">
          {/* Frozen left grid */}
          <div
            className="shrink-0 border-r border-border bg-background"
            style={{ width: LEFT_WIDTH }}
          >
            <div
              className="flex items-center border-b border-border px-3 text-xs font-semibold uppercase tracking-wide text-muted"
              style={{ height: HEADER_HEIGHT }}
            >
              <span className="w-10">ID</span>
              <span className="flex-1">Activity</span>
              <span className="w-20">Owner</span>
            </div>
            {showMilestones ? (
              <div
                className="flex items-center border-b border-border px-3 text-xs text-muted"
                style={{ height: MILESTONE_ROW_HEIGHT }}
              >
                Milestones
              </div>
            ) : null}
            {activities.map((a) => (
              <div
                key={a.id}
                className={`flex cursor-pointer items-center border-b border-border/70 px-3 text-xs ${
                  selectedId === a.id ? "bg-primary/5" : ""
                }`}
                style={{ height: ROW_HEIGHT }}
                onClick={() => setSelectedId(a.id)}
              >
                <span className="w-10 font-mono">{a.code}</span>
                <span className="flex-1 truncate font-medium">{a.name}</span>
                <span className="w-20 truncate text-muted">
                  {state.users[a.ownerId]?.name.split(" ")[0] ?? "—"}
                </span>
              </div>
            ))}
          </div>

          {/* Scrollable canvas */}
          <div
            ref={scrollRef}
            className="relative flex-1 overflow-auto"
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => setDrag(null)}
            onClick={() => setMenu(null)}
          >
            <div
              className="relative"
              style={{
                width: canvasWidth,
                height: HEADER_HEIGHT + bodyHeight,
              }}
            >
              {/* Header ticks */}
              <div
                className="sticky top-0 z-20 border-b border-border bg-background"
                style={{ height: HEADER_HEIGHT, width: canvasWidth }}
              >
                {ticks.map((t) => (
                  <div
                    key={t.date}
                    className="absolute top-0 border-l border-border/60 px-1 pt-2 text-[10px] text-muted"
                    style={{
                      left: xFor(t.date),
                      height: HEADER_HEIGHT,
                    }}
                  >
                    {t.label}
                  </div>
                ))}
              </div>

              {/* Grid + today */}
              <div
                className="absolute left-0"
                style={{
                  top: HEADER_HEIGHT,
                  width: canvasWidth,
                  height: bodyHeight,
                }}
              >
                {ticks.map((t) => (
                  <div
                    key={`g-${t.date}`}
                    className="absolute top-0 h-full border-l border-border/40"
                    style={{ left: xFor(t.date) }}
                  />
                ))}
                <div
                  className="pointer-events-none absolute top-0 z-10 h-full w-px bg-accent"
                  style={{ left: todayX }}
                  title={`Today ${state.meta.demoDate}`}
                />
                <div
                  className="pointer-events-none absolute z-10 -translate-x-1/2 rounded bg-accent px-1 text-[9px] text-white"
                  style={{ left: todayX, top: 2 }}
                >
                  Today
                </div>

                {/* Milestone diamonds */}
                {showMilestones ? (
                  <div
                    className="relative border-b border-border/70 bg-background/40"
                    style={{ height: MILESTONE_ROW_HEIGHT }}
                  >
                    {milestones.map((m) => (
                      <div
                        key={m.id}
                        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-2 border-primary bg-surface"
                        style={{
                          left: xFor(m.targetDate),
                          width: 12,
                          height: 12,
                        }}
                        title={m.name}
                      />
                    ))}
                  </div>
                ) : null}

                {/* Bars */}
                {activities.map((a, idx) => {
                  const { left, width } = barStyle(a.id);
                  const y =
                    (showMilestones ? MILESTONE_ROW_HEIGHT : 0) +
                    idx * ROW_HEIGHT +
                    8;
                  const baseline =
                    showBaseline && a.baselineStart && a.baselineEnd
                      ? {
                          left: xFor(a.baselineStart),
                          width: Math.max(
                            dayW,
                            (dayIndex(a.baselineStart, a.baselineEnd) + 1) *
                              dayW,
                          ),
                        }
                      : null;
                  const progress = Math.min(100, Math.max(0, a.percentComplete));
                  return (
                    <div key={a.id}>
                      {baseline ? (
                        <div
                          className="absolute rounded-sm border border-dashed border-muted/80 bg-transparent"
                          style={{
                            left: baseline.left,
                            width: baseline.width,
                            top: y + 18,
                            height: 6,
                          }}
                        />
                      ) : null}
                      <div
                        data-gantt-activity={a.id}
                        role="button"
                        tabIndex={0}
                        className={`absolute flex cursor-grab items-stretch rounded-md text-[10px] text-white shadow-sm active:cursor-grabbing ${statusBarClass(a.status)} ${highlightClass(a.id)}`}
                        style={{
                          left,
                          width,
                          top: y,
                          height: ROW_HEIGHT - 16,
                        }}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setSelectedId(a.id);
                        }}
                        onDoubleClick={() => {
                          window.location.href = `/programmes/activity/?programmeId=${programmeId}&activityId=${a.id}`;
                        }}
                        onContextMenu={(ev) => {
                          ev.preventDefault();
                          setSelectedId(a.id);
                          setMenu({
                            x: ev.clientX,
                            y: ev.clientY,
                            activityId: a.id,
                          });
                        }}
                        onPointerDown={(ev) =>
                          onBarPointerDown(ev, a.id, "move")
                        }
                      >
                        <div
                          className="w-1.5 shrink-0 cursor-ew-resize rounded-l-md bg-black/20"
                          onPointerDown={(ev) => {
                            ev.stopPropagation();
                            onBarPointerDown(ev, a.id, "resize-start");
                          }}
                        />
                        <div className="relative min-w-0 flex-1 overflow-hidden px-1 py-0.5">
                          <div
                            className="absolute inset-y-0 left-0 bg-white/25"
                            style={{ width: `${progress}%` }}
                          />
                          <span className="relative z-[1] truncate font-medium">
                            {a.code} · {progress}%
                          </span>
                        </div>
                        <div
                          className="w-1.5 shrink-0 cursor-ew-resize rounded-r-md bg-black/20"
                          onPointerDown={(ev) => {
                            ev.stopPropagation();
                            onBarPointerDown(ev, a.id, "resize-end");
                          }}
                        />
                        <div
                          className="absolute -right-2 top-1/2 z-[2] size-3 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-white bg-primary"
                          title="Drag to link dependency"
                          onPointerDown={(ev) => {
                            ev.stopPropagation();
                            onBarPointerDown(ev, a.id, "link");
                          }}
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Dependency arrows */}
                {showDeps ? (
                  <svg
                    className="pointer-events-none absolute inset-0"
                    width={canvasWidth}
                    height={bodyHeight}
                  >
                    {deps.map((d) => {
                      if (!d.predecessorId) return null;
                      const fromIdx = rowIndex.get(d.predecessorId);
                      const toIdx = rowIndex.get(d.successorId);
                      if (fromIdx == null || toIdx == null) return null;
                      const fromBar = barStyle(d.predecessorId);
                      const toBar = barStyle(d.successorId);
                      const y0 =
                        (showMilestones ? MILESTONE_ROW_HEIGHT : 0) +
                        fromIdx * ROW_HEIGHT +
                        ROW_HEIGHT / 2;
                      const y1 =
                        (showMilestones ? MILESTONE_ROW_HEIGHT : 0) +
                        toIdx * ROW_HEIGHT +
                        ROW_HEIGHT / 2;
                      const x0 = fromBar.left + fromBar.width;
                      const x1 = toBar.left;
                      const mid = (x0 + x1) / 2;
                      const color =
                        d.type === "FS"
                          ? "#0B2545"
                          : d.type === "SS"
                            ? "#2563EB"
                            : d.type === "FF"
                              ? "#B5543C"
                              : "#64748B";
                      return (
                        <g key={d.id}>
                          <path
                            d={`M ${x0} ${y0} L ${mid} ${y0} L ${mid} ${y1} L ${x1} ${y1}`}
                            fill="none"
                            stroke={color}
                            strokeWidth={1.5}
                            markerEnd="url(#arrowhead)"
                          />
                        </g>
                      );
                    })}
                    <defs>
                      <marker
                        id="arrowhead"
                        markerWidth="6"
                        markerHeight="6"
                        refX="5"
                        refY="3"
                        orient="auto"
                      >
                        <path d="M0,0 L6,3 L0,6 Z" fill="#0B2545" />
                      </marker>
                    </defs>
                  </svg>
                ) : null}

                {/* Link drag line */}
                {drag?.mode === "link" && scrollRef.current ? (
                  <svg className="pointer-events-none absolute inset-0 z-30 h-full w-full">
                    <line
                      x1={
                        barStyle(drag.activityId).left +
                        barStyle(drag.activityId).width
                      }
                      y1={
                        (showMilestones ? MILESTONE_ROW_HEIGHT : 0) +
                        (rowIndex.get(drag.activityId) ?? 0) * ROW_HEIGHT +
                        ROW_HEIGHT / 2
                      }
                      x2={
                        drag.linkX! -
                        scrollRef.current.getBoundingClientRect().left +
                        scrollRef.current.scrollLeft
                      }
                      y2={
                        drag.linkY! -
                        scrollRef.current.getBoundingClientRect().top +
                        scrollRef.current.scrollTop -
                        HEADER_HEIGHT
                      }
                      stroke="#B5543C"
                      strokeWidth={2}
                      strokeDasharray="4 3"
                    />
                  </svg>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ImpactPanel
        sourceActivityId={impactSource}
        onApplied={() => {
          push({
            title: "Shifts applied",
            tone: "success",
            undoLabel: "Undo",
            onUndo: () => undo(),
          });
          setHighlightDown(false);
        }}
        onDismissed={() => {
          push({ title: "Impact dismissed — schedule conflict kept", tone: "warning" });
          setHighlightDown(false);
        }}
      />

      {menu ? (
        <div
          className="fixed z-50 min-w-[12rem] rounded-md border border-border bg-surface py-1 shadow-lg"
          style={{ left: menu.x, top: menu.y }}
        >
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-sm hover:bg-background"
            onClick={() => {
              updateActivity(menu.activityId, { status: "delayed" });
              push({ title: "Marked delayed", tone: "warning" });
              setMenu(null);
            }}
          >
            Mark delayed
          </button>
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-sm hover:bg-background"
            onClick={() => {
              setSelectedId(menu.activityId);
              setHighlightDown(true);
              setMenu(null);
            }}
          >
            Highlight downstream
          </button>
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-sm hover:bg-background"
            onClick={() => {
              window.location.href = `/programmes/activity/?programmeId=${programmeId}&activityId=${menu.activityId}`;
              setMenu(null);
            }}
          >
            Open workspace
          </button>
        </div>
      ) : null}
    </div>
  );
}
