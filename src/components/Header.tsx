import { KHLogo } from './KHLogo';
import { StarBorderButton } from './StarBorderButton';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  showOperatorInfo?: boolean;
  operatorNumber?: string;
  productId?: string;
  currentStep?: number;
  totalSteps?: number;
  onRestart?: () => void;
  onShowLogs?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title = "Guía de Producción",
  subtitle = "Sistema de control de calidad",
  showBackButton = false,
  onBackClick,
  showOperatorInfo = false,
  operatorNumber,
  productId,
  currentStep,
  totalSteps,
  onRestart,
  onShowLogs
}) => {
  return (
    <header className="bg-black/20 backdrop-blur-md border-b border-white/10 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left Section - Logo and Back Button */}
          <div className="flex items-center space-x-4">
            {showBackButton && onBackClick && (
              <StarBorderButton
                variant="secondary"
                size="sm"
                onClick={onBackClick}
                className="flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Volver</span>
              </StarBorderButton>
            )}

            <div className="flex items-center space-x-3">
              <KHLogo size={50} />
              <div>
                <h1 className="text-2xl font-bold text-white">{title}</h1>
                <p className="text-gray-300 text-sm">{subtitle}</p>
              </div>
            </div>
          </div>

          {/* Center Section - Step Info */}
          {currentStep && totalSteps && (
            <div className="hidden md:flex flex-col items-center">
              <div className="text-xl font-bold text-white mb-1">
                Paso {currentStep} de {totalSteps}
              </div>
              <div className="w-64 bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Right Section - Operator Info and Actions */}
          <div className="flex items-center space-x-4">
            {showOperatorInfo && (
              <div className="hidden sm:flex flex-col items-end text-white">
                {operatorNumber && (
                  <div className="text-sm opacity-75">Operario:</div>
                )}
                {operatorNumber && (
                  <div className="font-mono font-bold">{operatorNumber}</div>
                )}
                {productId && (
                  <>
                    <div className="text-sm opacity-75">Producto:</div>
                    <div className="font-mono font-bold">{productId}</div>
                  </>
                )}
              </div>
            )}

            {onShowLogs && (
              <StarBorderButton
                variant="secondary"
                size="sm"
                onClick={onShowLogs}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m-6-4h6m-7 4h.01M5 16h.01M5 20h.01M9 20h.01M13 20h.01M17 20h.01M21 20h.01M21 16h.01M21 12h.01M21 8h.01M21 4h.01M17 4h.01M13 4h.01M9 4h.01M5 4h.01M5 8h.01M5 12h.01" />
                </svg>
                <span>Logs</span>
              </StarBorderButton>
            )}

            {onRestart && (
              <StarBorderButton
                variant="danger"
                size="sm"
                onClick={onRestart}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Reiniciar</span>
              </StarBorderButton>
            )}
          </div>
        </div>

        {/* Mobile Step Info */}
        {currentStep && totalSteps && (
          <div className="md:hidden mt-3 flex flex-col items-center">
            <div className="text-lg font-bold text-white mb-2">
              Paso {currentStep} de {totalSteps}
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Mobile Operator Info */}
        {showOperatorInfo && (
          <div className="sm:hidden mt-3 flex justify-center space-x-6 text-white text-sm">
            {operatorNumber && (
              <div className="flex flex-col items-center">
                <span className="opacity-75">Operario</span>
                <span className="font-mono font-bold">{operatorNumber}</span>
              </div>
            )}
            {productId && (
              <div className="flex flex-col items-center">
                <span className="opacity-75">Producto</span>
                <span className="font-mono font-bold">{productId}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
