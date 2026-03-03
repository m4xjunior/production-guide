"use client";

import { useState, useRef } from "react";
import { StarBorderButton } from "./StarBorderButton";
import { AdminPanel } from "./devkit";

interface ProductUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: () => void;
}

export const ProductUploadModal: React.FC<ProductUploadModalProps> = ({
  isOpen,
  onClose,
  onProductCreated,
}) => {
  const [productId, setProductId] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  const csvInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !productId.trim() ||
      !csvFile ||
      !imageFiles ||
      imageFiles.length === 0
    ) {
      alert("Por favor, complete todos los campos requeridos");
      return;
    }

    setIsUploading(true);
    setUploadProgress("Creando producto...");

    try {
      const formData = new FormData();
      formData.append("productId", productId.trim());
      formData.append("csvFile", csvFile);

      // Add all image files
      Array.from(imageFiles).forEach((file) => {
        formData.append(`images`, file);
      });

      setUploadProgress("Subiendo archivos...");

      const response = await fetch("/api/products/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Error al crear el producto");
      }

      setUploadProgress("¡Producto creado exitosamente!");

      // Reset form
      setProductId("");
      setCsvFile(null);
      setImageFiles(null);
      if (csvInputRef.current) csvInputRef.current.value = "";
      if (imageInputRef.current) imageInputRef.current.value = "";

      // Close modal and refresh products
      setTimeout(() => {
        onProductCreated();
        onClose();
        setUploadProgress("");
      }, 1500);
    } catch (error) {
      console.error("Upload error:", error);
      alert(
        `Error: ${error instanceof Error ? error.message : "Error desconocido"}`,
      );
      setUploadProgress("");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      onClose();
      // Reset form when closing
      setProductId("");
      setCsvFile(null);
      setImageFiles(null);
      if (csvInputRef.current) csvInputRef.current.value = "";
      if (imageInputRef.current) imageInputRef.current.value = "";
      setUploadProgress("");
    }
  };

  return (
    <AdminPanel
      isOpen={isOpen}
      onClose={handleClose}
      title="Crear Nuevo Producto"
      icon="➕"
      disableClose={isUploading}
    >
        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Product ID Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              ID del Producto *
            </label>
            <input
              type="text"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              placeholder="Ej: 12345"
              className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-gray-400"
              required
              disabled={isUploading}
              pattern="[0-9A-Za-z]+"
              title="Solo números y letras, sin espacios"
            />
            <p className="text-xs text-gray-400 mt-1">
              Solo números y letras. Será el nombre de la carpeta.
            </p>
          </div>

          {/* CSV File Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Archivo CSV *
            </label>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700"
              required
              disabled={isUploading}
            />
            <p className="text-xs text-gray-400 mt-1">
              Debe contener las columnas: paso, tipo, mensaje, voz, respuesta,
              fotos
            </p>
          </div>

          {/* Images Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Imágenes *
            </label>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setImageFiles(e.target.files)}
              className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
              required
              disabled={isUploading}
            />
            <p className="text-xs text-gray-400 mt-1">
              Seleccione todas las imágenes (P1.png, P2.png, etc.)
            </p>
            {imageFiles && (
              <p className="text-sm text-green-400 mt-2">
                {imageFiles.length} imagen(es) seleccionada(s)
              </p>
            )}
          </div>

          {/* Upload Progress */}
          {uploadProgress && (
            <div className="bg-blue-500/20 border border-blue-500/40 rounded-lg p-4">
              <p className="text-blue-300 font-medium flex items-center space-x-2">
                {isUploading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                )}
                <span>{uploadProgress}</span>
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end space-x-4 pt-4">
            <StarBorderButton
              variant="secondary"
              onClick={handleClose}
              disabled={isUploading}
            >
              Cancelar
            </StarBorderButton>
            <button
              type="submit"
              className="group relative overflow-hidden rounded-lg font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 border-green-500 px-4 py-3 text-base transform transition-all duration-300 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              disabled={
                isUploading || !productId.trim() || !csvFile || !imageFiles
              }
            >
              {isUploading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creando...</span>
                </div>
              ) : (
                "Crear Producto"
              )}
            </button>
          </div>
        </form>
    </AdminPanel>
  );
};
