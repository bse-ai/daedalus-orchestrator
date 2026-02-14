import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { createSessionSlug as createSessionSlugId } from "./session-slug.js";

const DEFAULT_JOB_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MIN_JOB_TTL_MS = 60 * 1000; // 1 minute
const MAX_JOB_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours
const DEFAULT_PENDING_OUTPUT_CHARS = 30_000;

function clampTtl(value: number | undefined) {
  if (!value || Number.isNaN(value)) {
    return DEFAULT_JOB_TTL_MS;
  }
  return Math.min(Math.max(value, MIN_JOB_TTL_MS), MAX_JOB_TTL_MS);
}

let jobTtlMs = clampTtl(Number.parseInt(process.env.PI_BASH_JOB_TTL_MS ?? "", 10));

export type ProcessStatus = "running" | "completed" | "failed" | "killed";

export type SessionStdin = {
  write: (data: string, cb?: (err?: Error | null) => void) => void;
  end: () => void;
  // When backed by a real Node stream (child.stdin), this exists; for PTY wrappers it may not.
  destroy?: () => void;
  destroyed?: boolean;
};

export interface ProcessSession {
  id: string;
  command: string;
  scopeKey?: string;
  sessionKey?: string;
  notifyOnExit?: boolean;
  exitNotified?: boolean;
  child?: ChildProcessWithoutNullStreams;
  stdin?: SessionStdin;
  pid?: number;
  startedAt: number;
  cwd?: string;
  maxOutputChars: number;
  pendingMaxOutputChars?: number;
  totalOutputChars: number;
  pendingStdout: string[];
  pendingStderr: string[];
  pendingStdoutChars: number;
  pendingStderrChars: number;
  aggregated: string;
  tail: string;
  exitCode?: number | null;
  exitSignal?: NodeJS.Signals | number | null;
  exited: boolean;
  truncated: boolean;
  backgrounded: boolean;
}

export interface FinishedSession {
  id: string;
  command: string;
  scopeKey?: string;
  startedAt: number;
  endedAt: number;
  cwd?: string;
  status: ProcessStatus;
  exitCode?: number | null;
  exitSignal?: NodeJS.Signals | number | null;
  aggregated: string;
  tail: string;
  truncated: boolean;
  totalOutputChars: number;
}

const runningSessions = new Map<string, ProcessSession>();
const finishedSessions = new Map<string, FinishedSession>();

let sweeper: NodeJS.Timeout | null = null;

function isSessionIdTaken(id: string) {
  return runningSessions.has(id) || finishedSessions.has(id);
}

export function createSessionSlug(): string {
  return createSessionSlugId(isSessionIdTaken);
}

export function addSession(session: ProcessSession) {
  runningSessions.set(session.id, session);
  startSweeper();
}

export function getSession(id: string) {
  return runningSessions.get(id);
}

export function getFinishedSession(id: string) {
  return finishedSessions.get(id);
}

export function deleteSession(id: string) {
  runningSessions.delete(id);
  finishedSessions.delete(id);
}

export function appendOutput(session: ProcessSession, stream: "stdout" | "stderr", chunk: string) {
  session.pendingStdout ??= [];
  session.pendingStderr ??= [];
  session.pendingStdoutChars ??= sumPendingChars(session.pendingStdout);
  session.pendingStderrChars ??= sumPendingChars(session.pendingStderr);
  const buffer = stream === "stdout" ? session.pendingStdout : session.pendingStderr;
  const bufferChars = stream === "stdout" ? session.pendingStdoutChars : session.pendingStderrChars;
  const pendingCap = Math.min(
    session.pendingMaxOutputChars ?? DEFAULT_PENDING_OUTPUT_CHARS,
    session.maxOutputChars,
  );
  buffer.push(chunk);
  let pendingChars = bufferChars + chunk.length;
  if (pendingChars > pendingCap) {
    session.truncated = true;
    pendingChars = capPendingBuffer(buffer, pendingChars, pendingCap);
  }
  if (stream === "stdout") {
    session.pendingStdoutChars = pendingChars;
  } else {
    session.pendingStderrChars = pendingChars;
  }
  session.totalOutputChars += chunk.length;
  const aggregated = trimWithCap(session.aggregated + chunk, session.maxOutputChars);
  session.truncated =
    session.truncated || aggregated.length < session.aggregated.length + chunk.length;
  session.aggregated = aggregated;
  session.tail = tail(session.aggregated, 2000);
}

export function drainSession(session: ProcessSession) {
  const stdout = session.pendingStdout.join("");
  const stderr = session.pendingStderr.join("");
  session.pendingStdout = [];
  session.pendingStderr = [];
  session.pendingStdoutChars = 0;
  session.pendingStderrChars = 0;
  return { stdout, stderr };
}

export function markExited(
  session: ProcessSession,
  exitCode: number | null,
  exitSignal: NodeJS.Signals | number | null,
  status: ProcessStatus,
) {
  session.exited = true;
  session.exitCode = exitCode;
  session.exitSignal = exitSignal;
  session.tail = tail(session.aggregated, 2000);
  moveToFinished(session, status);
}

export function markBackgrounded(session: ProcessSession) {
  session.backgrounded = true;
}

function moveToFinished(session: ProcessSession, status: ProcessStatus) {
  runningSessions.delete(session.id);

  // CRITICAL FIX: Always ensure child process is cleaned up
  if (session.child && !session.exited) {
    try {
      session.child.kill("SIGKILL");
    } catch {
      // Process may have already exited - safe to ignore
    }
  }

  // Clean up child process stdio streams to prevent FD leaks
  if (session.child) {
    session.child.stdin?.destroy?.();
    session.child.stdout?.destroy?.();
    session.child.stderr?.destroy?.();
    session.child.removeAllListeners();
    session.child = undefined;
  }

  if (!session.backgrounded) {
    return;
  }
  finishedSessions.set(session.id, {
    id: session.id,
    command: session.command,
    scopeKey: session.scopeKey,
    startedAt: session.startedAt,
    endedAt: Date.now(),
    cwd: session.cwd,
    status,
    exitCode: session.exitCode,
    exitSignal: session.exitSignal,
    aggregated: session.aggregated,
    tail: session.tail,
    truncated: session.truncated,
    totalOutputChars: session.totalOutputChars,
  });
}

export function tail(text: string, max = 2000) {
  if (text.length <= max) {
    return text;
  }
  return text.slice(text.length - max);
}

function sumPendingChars(buffer: string[]) {
  let total = 0;
  for (const chunk of buffer) {
    total += chunk.length;
  }
  return total;
}

function capPendingBuffer(buffer: string[], pendingChars: number, cap: number) {
  if (pendingChars <= cap) {
    return pendingChars;
  }
  const last = buffer.at(-1);
  if (last && last.length >= cap) {
    buffer.length = 0;
    buffer.push(last.slice(last.length - cap));
    return cap;
  }
  while (buffer.length && pendingChars - buffer[0].length >= cap) {
    pendingChars -= buffer[0].length;
    buffer.shift();
  }
  if (buffer.length && pendingChars > cap) {
    const overflow = pendingChars - cap;
    buffer[0] = buffer[0].slice(overflow);
    pendingChars = cap;
  }
  return pendingChars;
}

export function trimWithCap(text: string, max: number) {
  if (text.length <= max) {
    return text;
  }
  return text.slice(text.length - max);
}

export function listRunningSessions() {
  return Array.from(runningSessions.values()).filter((s) => s.backgrounded);
}

export function listFinishedSessions() {
  return Array.from(finishedSessions.values());
}

export function clearFinished() {
  finishedSessions.clear();
}

export function getProcessStats() {
  return {
    running: runningSessions.size,
    finished: finishedSessions.size,
    total: runningSessions.size + finishedSessions.size,
    runningSessions: Array.from(runningSessions.values()).map((s) => ({
      id: s.id,
      pid: s.pid,
      command: s.command.slice(0, 80),
      startedAt: new Date(s.startedAt).toISOString(),
      backgrounded: s.backgrounded,
      exited: s.exited,
    })),
  };
}

export function resetProcessRegistryForTests() {
  runningSessions.clear();
  finishedSessions.clear();
  stopSweeper();
}

export function setJobTtlMs(value?: number) {
  if (value === undefined || Number.isNaN(value)) {
    return;
  }
  jobTtlMs = clampTtl(value);
  stopSweeper();
  startSweeper();
}

function pruneFinishedSessions() {
  const cutoff = Date.now() - jobTtlMs;
  for (const [id, session] of finishedSessions.entries()) {
    if (session.endedAt < cutoff) {
      finishedSessions.delete(id);
    }
  }
}

function startSweeper() {
  if (sweeper) {
    return;
  }
  sweeper = setInterval(pruneFinishedSessions, Math.max(30_000, jobTtlMs / 6));
  sweeper.unref?.();

  // Process monitoring to detect leaks early
  const monitor = setInterval(
    () => {
      const runningCount = runningSessions.size;
      const finishedCount = finishedSessions.size;
      const now = new Date().toISOString();

      console.log(`[${now}] Process stats: ${runningCount} running, ${finishedCount} finished`);

      if (runningCount > 10) {
        console.warn(`[PROCESS LEAK WARNING] ${runningCount} running sessions`);
        // Redact command content to avoid leaking secrets (API keys, passwords in args).
        // Log only session ID and PID for identification.
        const details = Array.from(runningSessions.values())
          .map(
            (s) =>
              `  - ${s.id} (pid:${s.pid}, age:${Math.round((Date.now() - s.startedAt) / 1000)}s)`,
          )
          .join("\n");
        console.warn("Running sessions:\n" + details);
      }
      if (finishedCount > 50) {
        console.warn(`[MEMORY WARNING] ${finishedCount} finished sessions`);
      }
    },
    5 * 60 * 1000,
  );
  monitor.unref?.();
}

function stopSweeper() {
  if (!sweeper) {
    return;
  }
  clearInterval(sweeper);
  sweeper = null;
}

export function killAllRunningSessions() {
  const sessions = Array.from(runningSessions.values());
  let killedCount = 0;

  for (const session of sessions) {
    if (session.child && !session.exited) {
      try {
        session.child.kill("SIGKILL");
        killedCount++;
      } catch {
        // Process may have already exited
      }
    }
  }

  runningSessions.clear();
  finishedSessions.clear();

  if (killedCount > 0) {
    console.log(`[SHUTDOWN] Killed ${killedCount} orphaned process(es)`);
  }
}

function registerShutdownHandlers() {
  const cleanup = () => {
    killAllRunningSessions();
  };
  process.on("SIGTERM", cleanup);
  process.on("SIGINT", cleanup);
  process.on("beforeExit", cleanup);
}

registerShutdownHandlers();
