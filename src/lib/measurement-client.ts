export type MeasurementEventPayload = {
  key: string;
  path: string;
  metadata?: unknown;
};

export const emitMeasurementEvent = async (payload: MeasurementEventPayload): Promise<void> => {
  if (typeof window === "undefined") return;

  try {
    await fetch("/api/v1/measure/events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // swallow
  }
};
