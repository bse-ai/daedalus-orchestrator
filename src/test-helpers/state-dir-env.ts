type StateDirEnvSnapshot = {
  forgeOrchStateDir: string | undefined;
};

export function snapshotStateDirEnv(): StateDirEnvSnapshot {
  return {
    forgeOrchStateDir: process.env.FORGE_ORCH_STATE_DIR,
  };
}

export function restoreStateDirEnv(snapshot: StateDirEnvSnapshot): void {
  if (snapshot.forgeOrchStateDir === undefined) {
    delete process.env.FORGE_ORCH_STATE_DIR;
  } else {
    process.env.FORGE_ORCH_STATE_DIR = snapshot.forgeOrchStateDir;
  }
}

export function setStateDirEnv(stateDir: string): void {
  process.env.FORGE_ORCH_STATE_DIR = stateDir;
}
