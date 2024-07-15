export async function tryAndRetry<T>(
  task: () => Promise<T>,
  maxRetries: number,
  retryIntervalMs: number,
): Promise<T> {
  let numRetries = 0;
  while (true) {
    try {
      const result = await task();
      return result;
    } catch (e) {
      console.warn(
        `Failed task with error: ${e}. Retrying in ${retryIntervalMs}ms`,
      );
      if (numRetries < maxRetries) {
        throw e;
      }
      await sleep(retryIntervalMs);
    }
  }
}

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(() => resolve(undefined), ms));
