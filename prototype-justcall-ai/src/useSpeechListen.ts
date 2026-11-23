import { useEffect, useState } from "react";

type SpeechStatus = "idle" | "listening" | "denied" | "unsupported";

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly 0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  readonly results: ArrayLike<SpeechRecognitionResultLike> & { length: number };
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function speechRecognitionCtor(): SpeechRecognitionCtor | null {
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

export function useSpeechListen(active: boolean, sessionKey: string | number) {
  const [heard, setHeard] = useState("");
  const [status, setStatus] = useState<SpeechStatus>("idle");

  useEffect(() => {
    setHeard("");
    if (!active) {
      setStatus("idle");
      return;
    }

    const Recognition = speechRecognitionCtor();
    if (!Recognition) {
      setStatus("unsupported");
      return;
    }

    let stopped = false;
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let spoken = "";
      for (let index = 0; index < event.results.length; index += 1) {
        spoken += event.results[index]![0].transcript;
        spoken += " ";
      }
      setHeard(spoken.trim());
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        stopped = true;
        setStatus("denied");
      }
    };

    recognition.onend = () => {
      if (stopped) return;
      try {
        recognition.start();
      } catch {
        /* already running */
      }
    };

    try {
      recognition.start();
      setStatus("listening");
    } catch {
      setStatus("unsupported");
    }

    return () => {
      stopped = true;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.abort();
      } catch {
        /* ignore */
      }
    };
  }, [active, sessionKey]);

  return { heard, status };
}
