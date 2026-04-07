export type AgenticPulseInitConfig = {
  projectId: string;
  userId?: string | null;
  autoTrack?: boolean;
  batchInterval?: number;
  endpointBase?: string;
};

export type AgenticPulseTrackPayload = Record<string, unknown>;

export type AgenticPulseFeedbackPayload = {
  message?: string;
  intent?: string;
  severity?: string;
};

export type AgenticPulseBrowserSdk = {
  init: (config: AgenticPulseInitConfig) => void;
  track: (eventName: string, data?: AgenticPulseTrackPayload) => void;
  feedback: (payload: AgenticPulseFeedbackPayload) => void;
  flush: () => void;
};

export declare function init(config: AgenticPulseInitConfig): void;
export declare function track(
  eventName: string,
  data?: AgenticPulseTrackPayload
): void;
export declare function feedback(
  payload: AgenticPulseFeedbackPayload
): void;
export declare function flush(): void;

declare const sdk: {
  init: typeof init;
  track: typeof track;
  feedback: typeof feedback;
  flush: typeof flush;
  AgenticPulse?: AgenticPulseBrowserSdk;
};

export default sdk;
