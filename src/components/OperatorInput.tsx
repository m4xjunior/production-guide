import { useState } from 'react';

interface OperatorInputProps {
  onOperatorSet: (operatorNumber: string) => void;
}

export const OperatorInput: React.FC<OperatorInputProps> = ({ onOperatorSet }) => {
  const [operatorNumber, setOperatorNumber] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (operatorNumber.trim()) {
      onOperatorSet(operatorNumber.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Guía de Producción
        </h1>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="operatorNumber"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Número de Operario
            </label>
            <input
              type="text"
              id="operatorNumber"
              value={operatorNumber}
              onChange={(e) => setOperatorNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ingrese su número de operario"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Comenzar
          </button>
        </form>
      </div>
    </div>
  );
};
