import { useState, useEffect } from "react";
import { DotGridBackground } from "./DotGridBackground";
import { Header } from "./Header";
import { ProductUploadModal } from "./ProductUploadModal";

interface ProductSelectorAnimatedProps {
  onProductSelected: (productId: string) => void;
  onBackClick?: () => void;
  onShowLogs?: () => void;
}

interface Product {
  id: string;
  name: string;
  description: string;
  steps: number;
  estimatedTime: string;
}

interface ProductButtonProps {
  product: Product;
  onClick: () => void;
  index: number;
}

const ProductButton: React.FC<ProductButtonProps> = ({
  product,
  onClick,
  index,
}) => {
  return (
    <div
      className="group relative overflow-hidden"
      style={{ animationDelay: `${index * 150}ms` }}
    >
      <button
        onClick={onClick}
        className="relative w-full h-32 bg-gradient-to-br from-red-600 via-red-700 to-red-800 rounded-2xl shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-red-300 overflow-hidden animate-fadeInUp voice-button"
      >
        {/* Glare Effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent rotate-45 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white p-4">
          <div className="text-2xl font-bold mb-2 group-hover:scale-110 transition-transform duration-300 high-contrast-text text-center">
            {product.id}
          </div>
        </div>

        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_white_1px,_transparent_0)] bg-[length:20px_20px]"></div>
        </div>
      </button>
    </div>
  );
};

export const ProductSelectorAnimated: React.FC<
  ProductSelectorAnimatedProps
> = ({ onProductSelected, onBackClick }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/products");
      if (response.ok) {
        const productsData = await response.json();
        setProducts(productsData);
      } else {
        console.error("Error loading products");
        setProducts([]);
      }
    } catch (error) {
      console.error("Error loading products:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleProductCreated = () => {
    loadProducts(); // Refresh product list
  };

  if (loading) {
    return (
      <div className="min-h-screen relative">
        {/* Loading Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-red-900 to-slate-900">
          <DotGridBackground
            dotColor="rgba(255, 255, 255, 0.15)"
            spacing="25px"
            dotSize="2px"
            className="animate-pulse"
          />
        </div>

        {/* Header */}
        <Header
          title="Selección de Producto"
          subtitle="Cargando productos disponibles..."
          showBackButton={!!onBackClick}
          onBackClick={onBackClick}
        />

        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="relative text-center z-10">
            <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-white mx-auto mb-4"></div>
            <p className="text-white text-xl font-semibold voice-optimized">
              Cargando productos...
            </p>
            <div className="mt-4 flex justify-center space-x-2">
              <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
              <div
                className="w-3 h-3 bg-red-400 rounded-full animate-pulse"
                style={{ animationDelay: "200ms" }}
              ></div>
              <div
                className="w-3 h-3 bg-red-400 rounded-full animate-pulse"
                style={{ animationDelay: "400ms" }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
      <Header
        title="Selección de Producto"
        subtitle="Seleccione un producto para comenzar la producción"
        showBackButton={!!onBackClick}
        onBackClick={onBackClick}
      />

      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-6">
        <div className="relative z-10 max-w-6xl w-full">
          <div className="text-center mb-16">
            <h1 className="text-6xl font-bold text-white mb-6 animate-fadeInDown high-contrast-text">
              Productos Disponibles
            </h1>
            <p
              className="text-2xl text-gray-200 animate-fadeInDown voice-optimized"
              style={{ animationDelay: "200ms" }}
            >
              Seleccione un producto para continuar
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product, index) => (
              <ProductButton
                key={product.id}
                product={product}
                onClick={() => onProductSelected(product.id)}
                index={index}
              />
            ))}

            {/* Create New Product Button */}
            <div
              className="group relative overflow-hidden"
              style={{ animationDelay: `${products.length * 150}ms` }}
            >
              <button
                onClick={() => setShowUploadModal(true)}
                disabled={true}
                className="relative w-full h-32 bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800 rounded-2xl shadow-lg transform transition-all duration-300 overflow-hidden animate-fadeInUp border-2 border-dashed border-gray-500 opacity-50 cursor-not-allowed"
              >
                {/* Content */}
                <div className="relative z-10 flex flex-col items-center justify-center h-full text-white">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">
                    +
                  </div>
                  <div className="text-lg font-semibold opacity-60 mb-1">
                    Crear Nuevo
                  </div>
                  <div className="text-sm opacity-50">(Desactivado)</div>
                </div>

                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_white_1px,_transparent_0)] bg-[length:20px_20px]"></div>
                </div>
              </button>
            </div>
          </div>

          <div className="mt-16 text-center">
            <div
              className="inline-flex items-center space-x-3 text-gray-300 text-lg animate-fadeInUp"
              style={{ animationDelay: "600ms" }}
            >
              <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
              <span className="font-medium">
                Haga clic en un producto para continuar
              </span>
              <div
                className="w-3 h-3 bg-red-600 rounded-full animate-pulse"
                style={{ animationDelay: "500ms" }}
              ></div>
            </div>

            {/* Indicador visual para uso por voz */}
            <div
              className="mt-6 inline-flex items-center space-x-2 text-blue-300 text-sm bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20 animate-fadeInUp"
              style={{ animationDelay: "700ms" }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Interfaz optimizada para control por voz</span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Upload Modal */}
      <ProductUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onProductCreated={handleProductCreated}
      />

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

        @media (prefers-reduced-motion: reduce) {
          .animate-fadeInUp,
          .animate-fadeInDown {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
