"use client";
import { useCallback, useEffect, useState } from "react";

export type Priority = "high" | "medium" | "low";
export interface Task { id: string; title: string; date: string; priority: Priority; completedAt: string | null; createdAt: string }
export const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const taskStorageKey = (account: string) => `dayflow:tasks:v1:${account || "guest"}`;
export function useTasks(account: string) {
  const key = taskStorageKey(account);
  const [snapshot, setSnapshot] = useState<{ key: string; tasks: Task[] }>({ key: "", tasks: [] });
  const [error, setError] = useState("");
  useEffect(() => {
    const load = () => {
      try {
        const value = JSON.parse(localStorage.getItem(key) || "[]");
        const tasks = Array.isArray(value) ? value.filter((t): t is Task => t && typeof t.id === "string" && typeof t.title === "string" && typeof t.date === "string" && ["high", "medium", "low"].includes(t.priority)) : [];
        setSnapshot({ key, tasks });
      } catch { setError("Your tasks could not be loaded. Browser storage may be unavailable."); }
    };
    load();
    const onStorage = (e: StorageEvent) => { if (e.key === key || e.key === null) load(); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key]);
  const change = useCallback((fn: (tasks: Task[]) => Task[]) => {
    setSnapshot((old) => {
      if (old.key !== key) return old;
      const tasks = fn(old.tasks);
      try { localStorage.setItem(key, JSON.stringify(tasks)); }
      catch { setError("Tasks are available this session, but your browser could not save them."); }
      return { key, tasks };
    });
  }, [key]);
  const add = (title: string, date: string, priority: Priority) => {
    if (!title.trim()) return;
    change((items) => [...items, { id: crypto.randomUUID(), title: title.trim(), date, priority, completedAt: null, createdAt: new Date().toISOString() }]);
  };
  return {
    tasks: snapshot.key === key ? snapshot.tasks : [], error, add,
    toggle: (id: string) => change((items) => items.map((t) => t.id === id ? { ...t, completedAt: t.completedAt ? null : new Date().toISOString() } : t)),
    remove: (id: string) => change((items) => items.filter((t) => t.id !== id)),
    move: (id: string, direction: -1 | 1) => change((items) => {
      const i = items.findIndex((t) => t.id === id), to = i + direction;
      if (i < 0 || to < 0 || to >= items.length) return items;
      const next = [...items]; [next[i], next[to]] = [next[to], next[i]]; return next;
    }),
  };
}
export type TaskStore = ReturnType<typeof useTasks>;
export function weekActivity(tasks: Task[], now = new Date()) {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (now.getDay() + 6) % 7);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday); day.setDate(day.getDate() + i);
    const date = localDate(day);
    return { date, label: day.toLocaleDateString("en-US", { weekday: "short" }), count: tasks.filter((t) => t.completedAt && localDate(new Date(t.completedAt)) === date).length };
  });
}
