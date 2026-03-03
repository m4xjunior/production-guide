"use client";
import { useTransition, animated } from "@react-spring/web";
import { Check } from "lucide-react";

interface SuccessFeedbackProps {
  visible: boolean;
}

export function SuccessFeedback({ visible }: SuccessFeedbackProps) {
  const transitions = useTransition(visible, {
    from: { opacity: 0, scale: 0.6 },
    enter: { opacity: 1, scale: 1 },
    leave: { opacity: 0, scale: 1.3 },
    config: { tension: 320, friction: 20 },
  });

  return (
    <>
      {transitions((style, show) =>
        show ? (
          <animated.div
            style={style}
            className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
          >
            <div className="bg-emerald-500 text-white rounded-full p-10 shadow-2xl shadow-emerald-500/50">
              <Check className="h-20 w-20 stroke-[3]" />
            </div>
          </animated.div>
        ) : null,
      )}
    </>
  );
}
