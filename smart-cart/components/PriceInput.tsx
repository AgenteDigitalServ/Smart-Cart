import React, { useState, useEffect, useRef } from 'react';
import { Check, X, Sparkles, Tag, Loader2, Minus, Plus } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface PriceInputProps {
  code: string;
  image?: string | null;
  onConfirm: (price: number, name: string, quantity: number) => void;
  onCancel: () => void;
}

const PriceInput: React.FC<PriceInputProps> = ({ code, image, onConfirm, onCancel }) => {
  const [inputValue, setInputValue] = useState('');
  const [nameValue, setNameValue] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto focus price input on mount
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // Trigger AI identification if image exists
    if (image && process.env.API_KEY) {
      identifyProduct(image);
    }
  }, [image]);

  const identifyProduct = async (base64Image: string) => {
    setIsIdentifying(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Clean base64 string if it contains metadata header
      const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: cleanBase64
              }
            },
            {
              text: "Analise esta imagem de um produto de supermercado. Retorne APENAS o nome curto e comum do produto em Português do Brasil (ex: 'Coca-Cola 2L', 'Arroz Tio João 5kg'). Não use pontuação final."
            }
          ]
        }
      });
      
      const text = response.text;
      if (text) {
        setNameValue(text.trim());
      }
    } catch (error) {
      console.error("Erro na identificação IA:", error);
    } finally {
      setIsIdentifying(false);
    }
  };

  const handleQuantityChange = (delta: number) => {
    setQuantity(prev => Math.max(1, prev + delta));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Normalize input
    const normalizedValue = inputValue.replace(',', '.');
    const price = parseFloat(normalizedValue);
    
    // Default name if empty
    const finalName = nameValue.trim() || `Produto ${code.slice(-4)}`;

    if (!isNaN(price) && price > 0) {
      onConfirm(price, finalName, quantity);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100 flex flex-col max-h-[90vh]">
        <div className="bg-blue-600 p-4 text-white flex justify-between items-center shadow-lg shrink-0">
          <h3 className="font-semibold text-lg tracking-wide flex items-center gap-2">
            <Tag size={20} />
            Detalhes do Item
          </h3>
          <button onClick={onCancel} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {/* Code Badge */}
          <div className="mb-6 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Código
            </span>
            <div className="bg-slate-950 px-3 py-1 rounded text-slate-300 font-mono text-xs border border-slate-800">
              {code}
            </div>
          </div>
          
          {/* Image Thumbnail (if available) */}
          {image && (
             <div className="mb-4 flex justify-center">
               <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-slate-700 relative bg-black">
                 <img src={image} alt="Produto" className="w-full h-full object-cover" />
                 {isIdentifying && (
                   <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                     <Loader2 className="animate-spin text-blue-400" size={24} />
                   </div>
                 )}
               </div>
             </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Product Name Input */}
            <div className="mb-5">
              <label className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Nome do Produto
                {isIdentifying && <span className="text-blue-400 flex items-center gap-1 text-[10px]"><Sparkles size={10} /> IA Identificando...</span>}
              </label>
              <div className="relative">
                 <input
                  type="text"
                  placeholder="Digite o nome..."
                  className="w-full pl-4 pr-10 py-3 text-base font-medium text-white bg-slate-800 border border-slate-700 rounded-xl focus:border-blue-500 focus:ring-0 focus:outline-none transition-colors placeholder-slate-600"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                />
                {nameValue && !isIdentifying && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                    <Check size={16} />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 mb-6">
              {/* Quantity Input */}
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Qtd
                </label>
                <div className="flex items-center bg-slate-800 border-2 border-slate-700 rounded-xl overflow-hidden h-[60px]">
                  <button 
                    type="button"
                    onClick={() => handleQuantityChange(-1)}
                    className="h-full w-12 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 active:bg-slate-600 transition-colors"
                  >
                    <Minus size={20} />
                  </button>
                  <div className="flex-1 text-center font-bold text-xl text-white">
                    {quantity}
                  </div>
                  <button 
                    type="button"
                    onClick={() => handleQuantityChange(1)}
                    className="h-full w-12 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 active:bg-slate-600 transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>

              {/* Price Input */}
              <div className="flex-[2]">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Valor Unit.
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-500 font-bold text-lg">R$</span>
                  </div>
                  <input
                    ref={inputRef}
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    placeholder="0,00"
                    className="w-full pl-10 pr-4 py-3 h-[60px] text-2xl font-bold text-white bg-slate-800 border-2 border-slate-700 rounded-xl focus:border-blue-500 focus:ring-0 focus:outline-none transition-colors placeholder-slate-600"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!inputValue}
              className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                inputValue 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 active:scale-95 hover:bg-blue-500' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Check size={24} />
              Adicionar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PriceInput;