export interface VoiceRecognitionResult {
  text: string;
}

interface SpeakTextOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
}

type RecognitionConstructor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }

  const candidate =
    (window as typeof window & { webkitSpeechRecognition?: RecognitionConstructor })
      .webkitSpeechRecognition ||
    (window as typeof window & { SpeechRecognition?: RecognitionConstructor })
      .SpeechRecognition;

  return candidate || null;
}

export function supportsVoiceInput() {
  return Boolean(getRecognitionConstructor());
}

export function startVoiceRecognition(): Promise<VoiceRecognitionResult> {
  return new Promise((resolve, reject) => {
    const Recognition = getRecognitionConstructor();
    if (!Recognition) {
      reject(new Error("Voice input is not supported in this browser."));
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const result = event.results?.[0]?.[0]?.transcript || "";
      resolve({ text: result.trim() });
    };

    recognition.onerror = (event) => {
      reject(new Error(event.error || "Voice recognition failed."));
    };

    recognition.onend = () => {
      // Handled by result/error callbacks.
    };

    recognition.start();
  });
}

let activeUtterance: SpeechSynthesisUtterance | null = null;

export function speakText(text: string, options: SpeakTextOptions = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text.trim()) {
    return false;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.96;
  utterance.pitch = 1;
  utterance.volume = 1;
  utterance.onstart = () => {
    activeUtterance = utterance;
    options.onStart?.();
  };
  utterance.onend = () => {
    if (activeUtterance === utterance) {
      activeUtterance = null;
    }
    options.onEnd?.();
  };
  utterance.onerror = () => {
    if (activeUtterance === utterance) {
      activeUtterance = null;
    }
    options.onError?.();
  };
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    activeUtterance = null;
    window.speechSynthesis.cancel();
  }
}
