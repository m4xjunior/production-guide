interface DotGridBackgroundProps {
  className?: string;
  dotColor?: string;
  dotSize?: string;
  spacing?: string;
}

export const DotGridBackground: React.FC<DotGridBackgroundProps> = ({
  className = "",
  dotColor = "rgba(255, 255, 255, 0.1)",
  dotSize = "1px",
  spacing = "30px"
}) => {
  return (
    <div
      className={`absolute inset-0 ${className}`}
      style={{
        backgroundImage: `radial-gradient(circle, ${dotColor} ${dotSize}, transparent ${dotSize})`,
        backgroundSize: `${spacing} ${spacing}`,
        backgroundPosition: '0 0, 15px 15px'
      }}
    />
  );
};
