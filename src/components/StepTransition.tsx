"use client";
import { useTransition, animated } from "@react-spring/web";

interface StepTransitionProps {
  stepKey: string;
  direction: "forward" | "backward";
  children: React.ReactNode;
}

export function StepTransition({ stepKey, direction, children }: StepTransitionProps) {
  const transitions = useTransition(stepKey, {
    from: {
      opacity: 0,
      transform: `translateX(${direction === "forward" ? "48px" : "-48px"})`,
    },
    enter: { opacity: 1, transform: "translateX(0px)" },
    leave: {
      opacity: 0,
      transform: `translateX(${direction === "forward" ? "-48px" : "48px"})`,
      position: "absolute" as const,
      width: "100%",
    },
    config: { tension: 300, friction: 28 },
    keys: stepKey,
  });

  return (
    <div className="relative w-full overflow-hidden">
      {transitions((style, key) =>
        key === stepKey ? (
          <animated.div style={style} className="w-full">
            {children}
          </animated.div>
        ) : null,
      )}
    </div>
  );
}
