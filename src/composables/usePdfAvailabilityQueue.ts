const MAX_CONCURRENT = 4;

type QueueTask = () => Promise<void>;

let activeCount = 0;
const pending: QueueTask[] = [];

function drainQueue() {
  while (activeCount < MAX_CONCURRENT && pending.length > 0) {
    const task = pending.shift();
    if (!task) break;
    activeCount += 1;
    task()
      .catch(() => {})
      .finally(() => {
        activeCount -= 1;
        drainQueue();
      });
  }
}

/** Limita HEAD concurrentes de disponibilidad PDF entre DocumentoItem montados. */
export function enqueuePdfAvailabilityCheck(task: QueueTask): void {
  pending.push(task);
  drainQueue();
}
