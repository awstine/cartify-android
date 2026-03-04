import { useEffect, useRef, useState } from "react";
import { subscribeLoadingProgress } from "../loadingProgress";

const ACTIVE_LIMIT = 92;

export const TopProgressBar = () => {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const finishTimerRef = useRef(null);
  const tickTimerRef = useRef(null);

  useEffect(() => {
    const clearTimers = () => {
      if (finishTimerRef.current) {
        window.clearTimeout(finishTimerRef.current);
        finishTimerRef.current = null;
      }
      if (tickTimerRef.current) {
        window.clearInterval(tickTimerRef.current);
        tickTimerRef.current = null;
      }
    };

    const unsubscribe = subscribeLoadingProgress((active) => {
      if (active) {
        if (finishTimerRef.current) {
          window.clearTimeout(finishTimerRef.current);
          finishTimerRef.current = null;
        }
        setVisible(true);
        setProgress((current) => (current > 0 && current < ACTIVE_LIMIT ? current : 8));
        if (!tickTimerRef.current) {
          tickTimerRef.current = window.setInterval(() => {
            setProgress((current) => {
              if (current >= ACTIVE_LIMIT) return current;
              const next = current + Math.max(1, (ACTIVE_LIMIT - current) * 0.08);
              return Math.min(ACTIVE_LIMIT, next);
            });
          }, 120);
        }
        return;
      }

      if (tickTimerRef.current) {
        window.clearInterval(tickTimerRef.current);
        tickTimerRef.current = null;
      }
      setProgress(100);
      finishTimerRef.current = window.setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 260);
    });

    return () => {
      clearTimers();
      unsubscribe();
    };
  }, []);

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-0 z-[200] h-1">
      <div
        className={`h-full bg-primary transition-[width,opacity] duration-200 ease-out ${visible ? "opacity-100" : "opacity-0"}`}
        style={{ width: `${progress}%` }}
        aria-hidden="true"
      />
    </div>
  );
};

