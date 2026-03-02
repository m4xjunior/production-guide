import Image from "next/image";

interface KHLogoProps {
  size?: number;
  className?: string;
}

export const KHLogo: React.FC<KHLogoProps> = ({
  size = 60,
  className = "",
}) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Image
        src="/logo-kh.png"
        alt="KH - Know How"
        width={size}
        height={size}
        className="object-contain"
        priority
      />
    </div>
  );
};
