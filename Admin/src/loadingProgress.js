const listeners = new Set();
let pendingCount = 0;

const emit = () => {
  const active = pendingCount > 0;
  listeners.forEach((listener) => listener(active));
};

export const subscribeLoadingProgress = (listener) => {
  listeners.add(listener);
  listener(pendingCount > 0);
  return () => listeners.delete(listener);
};

export const startLoadingProgress = () => {
  pendingCount += 1;
  emit();
  let settled = false;
  return () => {
    if (settled) return;
    settled = true;
    pendingCount = Math.max(0, pendingCount - 1);
    emit();
  };
};

export const withLoadingProgress = async (task) => {
  const stop = startLoadingProgress();
  try {
    return await task;
  } finally {
    stop();
  }
};

