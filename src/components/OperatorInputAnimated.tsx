import { useState } from "react";
import { KHLogo } from "./KHLogo";
import { DotGridBackground } from "./DotGridBackground";
import { Header } from "./Header";

interface OperatorInputAnimatedProps {
  onOperatorSet: (operatorNumber: string) => void;
}

export const OperatorInputAnimated: React.FC<OperatorInputAnimatedProps> = ({
  onOperatorSet,
}) => {
  const [operatorNumber, setOperatorNumber] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (operatorNumber.trim()) {
      onOperatorSet(operatorNumber.trim());
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Red Theme Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-red-900 to-slate-900">
        <DotGridBackground
          dotColor="rgba(255, 255, 255, 0.1)"
          spacing="30px"
          dotSize="2px"
        />
      </div>

      {/* Header */}
      <Header />

      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
        <div className="relative z-10 max-w-lg w-full">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-8 animate-fadeInDown">
              <KHLogo size={140} />
            </div>
            <h1
              className="text-6xl font-bold text-white mb-6 animate-fadeInDown high-contrast-text"
              style={{ animationDelay: "100ms" }}
            >
              Guía de Producción
            </h1>
            <p
              className="text-2xl text-gray-200 animate-fadeInDown voice-optimized"
              style={{ animationDelay: "200ms" }}
            >
              Sistema de control de calidad
            </p>
          </div>

          <div className="backdrop-blur-md bg-white/15 rounded-3xl shadow-2xl p-10 border border-white/30 animate-fadeInUp">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <label
                  htmlFor="operatorNumber"
                  className="block text-lg font-semibold text-gray-100 mb-4 animate-fadeInUp high-contrast-text"
                  style={{ animationDelay: "400ms" }}
                >
                  Número de Operario
                </label>
                <div
                  className="relative group animate-fadeInUp"
                  style={{ animationDelay: "500ms" }}
                >
                  <input
                    type="text"
                    id="operatorNumber"
                    value={operatorNumber}
                    onChange={(e) => setOperatorNumber(e.target.value)}
                    className="w-full px-6 py-5 text-xl bg-white/15 border-2 border-white/40 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-400/50 focus:border-red-400 text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-300 group-hover:bg-white/20 font-semibold"
                    placeholder="Ingrese su número de operario"
                    required
                    autoFocus
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-400/20 to-red-600/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -z-10 blur-sm"></div>
                </div>
              </div>

              <div
                className="animate-fadeInUp"
                style={{ animationDelay: "600ms" }}
              >
                <button
                  type="submit"
                  className="group relative w-full h-16 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold text-xl rounded-xl overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-red-300 voice-button"
                >
                  {/* Glare Effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent rotate-45 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
                  </div>

                  <span className="relative z-10 group-hover:scale-110 transition-transform duration-300 flex items-center justify-center space-x-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span>COMENZAR</span>
                  </span>

                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_white_1px,_transparent_0)] bg-[length:20px_20px]"></div>
                  </div>
                </button>
              </div>
            </form>

            <div
              className="mt-8 text-center animate-fadeInUp"
              style={{ animationDelay: "700ms" }}
            >
              <div className="inline-flex items-center space-x-3 text-gray-300 text-lg">
                <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
                <span className="font-medium">
                  Sistema de control de producción
                </span>
                <div
                  className="w-3 h-3 bg-red-600 rounded-full animate-pulse"
                  style={{ animationDelay: "500ms" }}
                ></div>
              </div>
            </div>

            {/* Indicador visual para uso por voz */}
            <div
              className="mt-6 text-center animate-fadeInUp"
              style={{ animationDelay: "800ms" }}
            >
              <div className="inline-flex items-center space-x-2 text-blue-300 text-sm bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
                <span>Optimizado para control por voz</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.8s ease-out forwards;
          opacity: 0;
        }

        .animate-fadeInDown {
          animation: fadeInDown 0.8s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
};
