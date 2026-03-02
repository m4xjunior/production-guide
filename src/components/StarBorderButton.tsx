import { ReactNode } from 'react';

interface StarBorderButtonProps {
  children: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

export const StarBorderButton: React.FC<StarBorderButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false
}) => {
  const getVariantColors = () => {
    switch (variant) {
      case 'primary':
        return 'from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 border-red-500';
      case 'secondary':
        return 'from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 border-gray-500';
      case 'danger':
        return 'from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 border-red-600';
      case 'success':
        return 'from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 border-green-500';
      case 'warning':
        return 'from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 border-yellow-500';
      default:
        return 'from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 border-red-500';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-2 text-sm';
      case 'md':
        return 'px-4 py-3 text-base';
      case 'lg':
        return 'px-6 py-4 text-lg';
      default:
        return 'px-4 py-3 text-base';
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        group relative overflow-hidden rounded-lg font-semibold text-white
        bg-gradient-to-r ${getVariantColors()}
        ${getSizeClasses()}
        transform transition-all duration-300 hover:scale-105 hover:shadow-xl
        focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        ${className}
      `}
    >
      {/* Star Border Animation */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        {/* Top Stars */}
        <div className="absolute top-0 left-1/4 w-1 h-1 bg-white rounded-full animate-pulse"></div>
        <div className="absolute top-0 right-1/4 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>

        {/* Right Stars */}
        <div className="absolute right-0 top-1/4 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        <div className="absolute right-0 bottom-1/4 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>

        {/* Bottom Stars */}
        <div className="absolute bottom-0 right-1/4 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.8s' }}></div>
        <div className="absolute bottom-0 left-1/4 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>

        {/* Left Stars */}
        <div className="absolute left-0 bottom-1/4 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '1.2s' }}></div>
        <div className="absolute left-0 top-1/4 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '1.4s' }}></div>

        {/* Corner Stars */}
        <div className="absolute top-1 left-1 w-0.5 h-0.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
        <div className="absolute top-1 right-1 w-0.5 h-0.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.7s' }}></div>
        <div className="absolute bottom-1 right-1 w-0.5 h-0.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '1.1s' }}></div>
        <div className="absolute bottom-1 left-1 w-0.5 h-0.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
      </div>

      {/* Glare Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent rotate-45 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
      </div>

      {/* Button Content */}
      <span className="relative z-10 flex items-center justify-center space-x-2 group-hover:scale-110 transition-transform duration-300">
        {children}
      </span>

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-300">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_white_1px,_transparent_0)] bg-[length:20px_20px]"></div>
      </div>
    </button>
  );
};
