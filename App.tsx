import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ShoppingCart, Scan, Trash2, Receipt, History, ChevronRight, CheckCircle2, FileDown, X, ArrowLeft, Printer } from 'lucide-react';
import Scanner from './components/Scanner';
import PriceInput from './components/PriceInput';
import { CartItem, Purchase } from './types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

// Inline Logo Component to prevent broken images
const SmartCartLogo = ({ className = "h-12 w-auto", iconOnly = false }: { className?: string, iconOnly?: boolean }) => (
  <svg 
    viewBox={iconOnly ? "0 0 60 60" : "0 0 280 60"} 
    className={className}
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="logo_grad" x1="0" y1="0" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#2563EB" />
      </linearGradient>
    </defs>
    
    {/* Icon Group */}
    <g transform="translate(10, 10)">
      <rect x="0" y="0" width="40" height="40" rx="10" fill="url(#logo_grad)" />
      <path d="M10 14 H14 L17 26 H29 L31 14" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="17" cy="30" r="2" fill="white"/>
      <circle cx="28" cy="30" r="2" fill="white"/>
      <path d="M20 20 L22 22 L26 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </g>

    {/* Text Group - Only rendered if not iconOnly */}
    {!iconOnly && (
      <g transform="translate(60, 38)">
        <text 
          fontFamily="sans-serif" 
          fontWeight="800" 
          fontSize="28" 
          fill="white"
          letterSpacing="-0.5"
        >
          SMART
          <tspan fill="#3B82F6" dx="5">CART</tspan>
        </text>
      </g>
    )}
  </svg>
);

// --- SWIPEABLE CART ITEM COMPONENT ---
interface SwipeableCartItemProps {
  item: CartItem;
  onDelete: (id: string) => void;
  formatCurrency: (val: number) => string;
}

const SwipeableCartItem: React.FC<SwipeableCartItemProps> = ({ item, onDelete, formatCurrency }) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const startX = useRef<number>(0);
  const itemRef = useRef<HTMLDivElement>(null);

  // Constants
  const DELETE_THRESHOLD = 100; // px to trigger delete
  const MAX_SWIPE = 150; // max visual swipe

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDeleted) return;
    const currentX = e.touches[0].clientX;
    const delta = currentX - startX.current;

    // Only allow swiping left (negative delta)
    if (delta < 0) {
      // Apply resistance as you swipe further
      const resistedDelta = Math.max(delta, -MAX_SWIPE); 
      setOffsetX(resistedDelta);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    if (offsetX < -DELETE_THRESHOLD) {
      // Trigger delete animation
      setOffsetX(-500); // Send it off screen
      setIsDeleted(true);
      setTimeout(() => {
        onDelete(item.id);
      }, 300); // Wait for transition
    } else {
      // Snap back
      setOffsetX(0);
    }
  };

  return (
    <div className={`relative mb-3 overflow-hidden rounded-xl transition-all duration-300 ${isDeleted ? 'h-0 mb-0 opacity-0' : 'h-auto opacity-100'}`}>
      {/* Background (Delete Layer) */}
      <div className="absolute inset-0 bg-red-600 flex items-center justify-end pr-6 rounded-xl">
        <div className="flex items-center gap-2 text-white font-bold animate-pulse">
          <span>Remover</span>
          <Trash2 size={24} />
        </div>
      </div>

      {/* Foreground (Item Content) */}
      <div 
        ref={itemRef}
        className="bg-slate-900 p-3 rounded-xl shadow-md border border-slate-800 flex justify-between items-center relative touch-pan-y"
        style={{ 
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center gap-3 overflow-hidden pointer-events-none select-none">
          {/* Image Thumbnail */}
          <div className="w-12 h-12 bg-black rounded-lg shrink-0 overflow-hidden border border-slate-700 flex items-center justify-center">
            {item.image ? (
               <img src={item.image} alt="" className="w-full h-full object-cover" />
            ) : (
               <ShoppingCart size={18} className="text-slate-600" />
            )}
          </div>
          
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold text-slate-200 truncate pr-2">
              {item.name}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {item.code}
              </span>
              {item.quantity > 1 && (
                 <span className="text-[10px] font-bold text-blue-300 bg-blue-900/30 px-1.5 rounded border border-blue-500/20">
                   {item.quantity}x {formatCurrency(item.price)}
                 </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 shrink-0 pointer-events-none select-none">
          <span className="text-base font-bold text-blue-400">
            {formatCurrency(item.price * item.quantity)}
          </span>
          {/* Visual indicator for swipe */}
          <div className="text-slate-600 pl-1 border-l border-slate-800">
             <ChevronRight size={16} className="opacity-30" />
          </div>
        </div>
      </div>
    </div>
  );
};


function App() {
  // Initialize state from Local Storage
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('smart_cart_items');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load items from local storage", e);
      return [];
    }
  });

  const [history, setHistory] = useState<Purchase[]>(() => {
    try {
      const saved = localStorage.getItem('smart_cart_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load history from local storage", e);
      return [];
    }
  });

  const [view, setView] = useState<'cart' | 'history'>('cart');
  
  const [isScanning, setIsScanning] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // For Smart Cart Memory Feature
  const [existingItem, setExistingItem] = useState<{price: number, name: string} | undefined>(undefined);

  // Persist State to Local Storage
  useEffect(() => {
    localStorage.setItem('smart_cart_items', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('smart_cart_history', JSON.stringify(history));
  }, [history]);

  const total = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }, [items]);

  // Helper to find existing item info
  const findLastItem = (code: string) => {
    // Check current cart first
    const cartItem = items.find(i => i.code === code);
    if (cartItem) return { price: cartItem.price, name: cartItem.name };

    // Check history
    for (const purchase of history) {
      const historyItem = purchase.items.find(i => i.code === code);
      if (historyItem) return { price: historyItem.price, name: historyItem.name };
    }
    return undefined;
  };

  const handleScan = (code: string, image?: string) => {
    setIsScanning(false);
    
    // Check if item exists in memory
    const knownItem = findLastItem(code);
    setExistingItem(knownItem);

    setScannedCode(code);
    setScannedImage(image || null);
  };

  const handlePriceConfirm = (price: number, name: string, quantity: number) => {
    if (scannedCode) {
      const newItem: CartItem = {
        id: crypto.randomUUID(),
        code: scannedCode,
        name: name,
        price: price,
        quantity: quantity,
        image: scannedImage || undefined,
        timestamp: Date.now(),
      };
      setItems(prev => [newItem, ...prev]);
      setScannedCode(null);
      setScannedImage(null);
      setExistingItem(undefined);
    }
  };

  const handlePriceCancel = () => {
    setScannedCode(null);
    setScannedImage(null);
    setExistingItem(undefined);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  };

  const generatePDF = async (purchaseItems: CartItem[], purchaseTotal: number, timestamp: number, purchaseId: string) => {
    try {
      // Robust initialization for jsPDF to handle different module loading behaviors
      const JsPDFConstructor = (jsPDF as any).jsPDF || jsPDF;
      const doc = new JsPDFConstructor();
      
      const dateObj = new Date(timestamp);
      const dateStr = dateObj.toLocaleDateString('pt-BR');
      const timeStr = dateObj.toLocaleTimeString('pt-BR');

      // 1. Branding Header
      doc.setFontSize(22);
      doc.setTextColor(37, 99, 235); // Blue
      doc.setFont("helvetica", "bold");
      doc.text("SMART CART", 14, 20); // Left aligned
      
      // 2. Generate QR Code with Purchase Details
      const qrData = JSON.stringify({
        id: purchaseId,
        dt: dateStr,
        val: purchaseTotal.toFixed(2),
        items: purchaseItems.length
      });
      const qrDataUrl = await QRCode.toDataURL(qrData, { margin: 1, width: 100 });
      doc.addImage(qrDataUrl, 'PNG', 165, 10, 30, 30); // Top Right

      // 3. Purchase Info
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.setFont("helvetica", "normal");
      doc.text(`ID: ${purchaseId.slice(0, 8).toUpperCase()}`, 14, 26);
      doc.text(`Data: ${dateStr} às ${timeStr}`, 14, 31);
      
      // Divider line
      doc.setLineWidth(0.5);
      doc.setDrawColor(200, 200, 200);
      doc.line(14, 38, 196, 38);

      // 4. Table Data Preparation
      // Columns: [Image, Product Name, Unit Price, Qty, Subtotal]
      const tableBody = purchaseItems.map(item => [
        item.image || '', // Column 0: Image Data (hidden text, used for drawing)
        item.name || "Item sem nome",
        formatCurrency(item.price),
        item.quantity.toString(),
        formatCurrency(item.price * item.quantity)
      ]);

      // 5. Generate Table with Images
      autoTable(doc, {
        startY: 45,
        head: [['Img', 'Produto', 'Valor Unit.', 'Qtd', 'Subtotal']],
        body: tableBody,
        theme: 'striped',
        headStyles: { 
          fillColor: [37, 99, 235], 
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center' 
        },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' }, // Image column
          1: { halign: 'left' },
          2: { halign: 'right' },
          3: { halign: 'center' },
          4: { halign: 'right' }
        },
        bodyStyles: {
          minCellHeight: 15, // Ensure height for images
          valign: 'middle'
        },
        // Hook to draw image in the cell
        didDrawCell: (data) => {
          if (data.column.index === 0 && data.cell.section === 'body') {
            const imageBase64 = data.cell.raw as string;
            if (imageBase64 && imageBase64.length > 100) {
              // Dim adjustments to fit in cell
              const dim = data.cell.height - 4; 
              doc.addImage(imageBase64, 'JPEG', data.cell.x + 2, data.cell.y + 2, dim, dim);
            }
          }
        },
        // Hide the raw base64 text in the first column
        didParseCell: (data) => {
          if (data.column.index === 0 && data.section === 'body') {
            data.cell.text = []; // Clear text
          }
        },
        foot: [['', '', 'TOTAL GERAL', '', formatCurrency(purchaseTotal)]],
        footStyles: { 
          fillColor: [241, 245, 249], 
          textColor: [0, 0, 0], 
          fontStyle: 'bold',
          halign: 'right'
        },
        styles: { fontSize: 9, cellPadding: 2 },
      });

      // Footer message
      const finalY = (doc as any).lastAutoTable.finalY || 150;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text("Este documento não possui valor fiscal.", 105, finalY + 10, { align: "center" });
      doc.text("Gerado pelo aplicativo Smart Cart", 105, finalY + 14, { align: "center" });

      // Save
      const filenameTime = dateObj.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
      const filenameDate = dateObj.toISOString().split('T')[0];
      doc.save(`SmartCart_Relatorio_${filenameDate}_${filenameTime}.pdf`);
      
      return true;
    } catch (error) {
      console.error("Erro na geração do PDF:", error);
      alert("Houve um problema ao gerar o PDF. O histórico será salvo, mas o arquivo não pôde ser baixado.");
      return false;
    }
  };

  // Open Checkout Modal
  const openCheckout = () => {
    if (items.length === 0) return;
    setIsCheckoutOpen(true);
  };

  // Actually finalize and generate PDF
  const confirmCheckout = async () => {
    const purchase: Purchase = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      total: total,
      itemCount: items.reduce((acc, i) => acc + i.quantity, 0),
      items: [...items],
    };

    // Save history first
    setHistory(prev => [purchase, ...prev]);
    
    // Generate PDF
    await generatePDF(purchase.items, purchase.total, purchase.timestamp, purchase.id);

    // Clear and redirect
    setItems([]);
    setIsCheckoutOpen(false);
    setView('history');
    setExpandedHistoryId(purchase.id);
    
    // Success feedback
    // alert("Compra finalizada com sucesso!");
  };

  const downloadHistoryPDF = (purchase: Purchase) => {
    generatePDF(purchase.items, purchase.total, purchase.timestamp, purchase.id);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative max-w-md mx-auto shadow-2xl overflow-hidden border-x border-slate-800">
      
      {/* App Header */}
      <header className="bg-slate-900 shadow-lg sticky top-0 z-10 border-b border-slate-800">
        
        {/* Logo Section */}
        <div className="flex justify-center pt-4 pb-2">
          <SmartCartLogo className="h-10 w-auto drop-shadow-md" />
        </div>

        <div className="p-2 flex items-center justify-between gap-2">
          {/* View Toggle */}
          <div className="flex bg-slate-800 p-1 rounded-xl flex-1">
             <button 
               onClick={() => setView('cart')}
               className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${view === 'cart' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
             >
               <ShoppingCart size={16} />
               Carrinho
             </button>
             <button 
               onClick={() => setView('history')}
               className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${view === 'history' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
             >
               <History size={16} />
               Histórico
             </button>
          </div>
          
          {view === 'cart' && (
            <button 
              className="p-3 text-slate-400 hover:text-red-400 transition-colors hover:bg-slate-800 rounded-xl border border-transparent hover:border-slate-700"
              onClick={() => { if(items.length > 0 && window.confirm('Limpar o carrinho?')) setItems([]) }}
              title="Limpar carrinho"
              disabled={items.length === 0}
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>
        
        {/* Sub-header for Cart Totals */}
        {view === 'cart' && (
          <div className="px-4 pb-3 flex justify-between items-end">
             <div>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Acumulado</span>
                <div className="text-2xl font-black text-white leading-none mt-1">
                  {formatCurrency(total)}
                </div>
             </div>
             <span className="text-xs text-slate-500 font-medium bg-slate-800 px-2 py-1 rounded-md border border-slate-700">
               {items.reduce((acc, item) => acc + item.quantity, 0)} un.
             </span>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-36 p-4 scrollbar-thin scrollbar-thumb-slate-700 overflow-x-hidden">
        
        {/* CART VIEW */}
        {view === 'cart' && (
          <>
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 mt-6">
                <div className="bg-slate-900/50 p-6 rounded-3xl mb-6 border border-slate-800/50 shadow-inner">
                  <SmartCartLogo className="h-16 w-auto opacity-70 grayscale" iconOnly={true} />
                </div>
                <p className="text-lg font-medium text-slate-300">Carrinho Vazio</p>
                <p className="text-sm mt-1 max-w-[200px] text-slate-500">
                  Toque em "Escanear" para iniciar suas compras
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <SwipeableCartItem 
                    key={item.id} 
                    item={item} 
                    onDelete={removeItem} 
                    formatCurrency={formatCurrency}
                  />
                ))}
                
                <div className="text-center py-4">
                  <p className="text-xs text-slate-600 italic">Deslize um item para a esquerda para remover</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* HISTORY VIEW */}
        {view === 'history' && (
          <div className="space-y-4">
            {history.length === 0 ? (
               <div className="text-center text-slate-500 mt-20">
                 <History size={48} className="mx-auto opacity-30 mb-4" />
                 <p>Nenhuma compra finalizada</p>
               </div>
            ) : (
              history.map((purchase) => (
                <div key={purchase.id} className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                  <div 
                    onClick={() => setExpandedHistoryId(expandedHistoryId === purchase.id ? null : purchase.id)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors"
                  >
                    <div>
                      <div className="text-sm font-bold text-white mb-0.5">{formatDate(purchase.timestamp)}</div>
                      <div className="text-xs text-slate-400">{purchase.itemCount} unidades</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-bold text-green-400">{formatCurrency(purchase.total)}</div>
                        <div className="text-xs text-green-400/60 uppercase font-bold tracking-wider">Finalizado</div>
                      </div>
                      <ChevronRight 
                        size={18} 
                        className={`text-slate-500 transition-transform ${expandedHistoryId === purchase.id ? 'rotate-90' : ''}`} 
                      />
                    </div>
                  </div>
                  
                  {expandedHistoryId === purchase.id && (
                    <div className="bg-slate-950/50 border-t border-slate-800">
                      <div className="p-3 space-y-2">
                        {purchase.items.map(item => (
                          <div key={item.id} className="flex justify-between items-center text-sm py-1 border-b border-slate-800/50 last:border-0">
                            <div className="flex flex-col w-2/3">
                               <span className="text-slate-300 truncate">{item.name}</span>
                               <span className="text-xs text-slate-500">{item.quantity}x {formatCurrency(item.price)}</span>
                            </div>
                            <span className="text-slate-400 font-medium">{formatCurrency(item.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-end">
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             downloadHistoryPDF(purchase);
                           }}
                           className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-blue-900/20 transition-colors"
                         >
                           <FileDown size={14} />
                           Baixar PDF
                         </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Bottom Actions (Only on Cart View) */}
      {view === 'cart' && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900 border-t border-slate-800 shadow-[0_-4px_20px_-1px_rgba(0,0,0,0.3)] p-4 z-20 flex flex-col gap-3">
          
          <div className="flex gap-3">
            <button
              onClick={() => setIsScanning(true)}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-900/40 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Scan size={20} />
              Escanear
            </button>
            
            {items.length > 0 && (
              <button
                onClick={openCheckout}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-green-900/40 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={20} />
                Finalizar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal (Receipt View) */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
           <div className="bg-slate-900 p-4 shadow-md flex items-center justify-between border-b border-slate-800">
              <button onClick={() => setIsCheckoutOpen(false)} className="p-2 text-slate-300 hover:text-white">
                <ArrowLeft size={24} />
              </button>
              <h2 className="text-lg font-bold text-white">Conferir Compra</h2>
              <div className="w-10"></div> {/* Spacer */}
           </div>

           <div className="flex-1 overflow-y-auto p-4">
              <div className="bg-white text-slate-900 rounded-lg shadow-xl overflow-hidden mb-6 relative">
                 {/* Receipt Jagged Edge Top */}
                 <div className="h-2 bg-slate-900 w-full relative -top-1"></div>
                 
                 <div className="p-6">
                    <div className="text-center border-b border-dashed border-slate-300 pb-4 mb-4">
                      <h3 className="font-bold text-xl uppercase tracking-widest text-slate-800">CUPOM</h3>
                      <p className="text-sm text-slate-500">{new Date().toLocaleString()}</p>
                    </div>

                    <div className="space-y-2 mb-6">
                       {items.map((item) => (
                         <div key={item.id} className="flex justify-between text-sm">
                           <div className="flex-1 pr-2">
                             <div className="font-semibold truncate text-slate-700">{item.name}</div>
                             <div className="text-xs text-slate-500">{item.quantity} x {formatCurrency(item.price)}</div>
                           </div>
                           <div className="font-bold text-slate-800">{formatCurrency(item.quantity * item.price)}</div>
                         </div>
                       ))}
                    </div>

                    <div className="border-t border-dashed border-slate-300 pt-4 flex justify-between items-end">
                       <span className="text-sm font-bold text-slate-500">TOTAL GERAL</span>
                       <span className="text-2xl font-black text-slate-900">{formatCurrency(total)}</span>
                    </div>
                 </div>

                 {/* Receipt Jagged Edge Bottom */}
                 <div 
                   className="h-4 w-full bg-slate-950" 
                   style={{
                     clipPath: "polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, 20% 0%, 25% 100%, 30% 0%, 35% 100%, 40% 0%, 45% 100%, 50% 0%, 55% 100%, 60% 0%, 65% 100%, 70% 0%, 75% 100%, 80% 0%, 85% 100%, 90% 0%, 95% 100%, 100% 0%)"
                   }}
                 ></div>
              </div>
           </div>

           <div className="p-4 bg-slate-900 border-t border-slate-800">
              <button 
                onClick={confirmCheckout}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Printer size={20} />
                Confirmar e Baixar PDF
              </button>
           </div>
        </div>
      )}

      {/* Modals / Overlays */}
      {isScanning && (
        <Scanner 
          onScan={handleScan} 
          onClose={() => setIsScanning(false)} 
        />
      )}

      {scannedCode && (
        <PriceInput 
          code={scannedCode} 
          image={scannedImage}
          onConfirm={handlePriceConfirm} 
          onCancel={handlePriceCancel}
          initialPrice={existingItem?.price}
          initialName={existingItem?.name}
        />
      )}
    </div>
  );
}

// Simple X icon component
const XIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

export default App;