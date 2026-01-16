
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ShoppingCart, Scan, Trash2, History, ChevronRight, CheckCircle2, FileDown, X, ArrowLeft, Printer, Share, Smartphone, Download, Info, Settings, SmartphoneNfc, ExternalLink } from 'lucide-react';
import Scanner from './components/Scanner';
import PriceInput from './components/PriceInput';
import { CartItem, Purchase } from './types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

// --- COMPONENTE DE GUIA DE INSTALAÇÃO (MODAL) ---
const InstallModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) setPlatform('ios');
    else if (/android/.test(userAgent)) setPlatform('android');

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') onClose();
    setDeferredPrompt(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Download className="text-white" size={28} />
            </div>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          <h3 className="text-xl font-bold text-white mb-2">Instalar Smart Cart</h3>
          <p className="text-slate-400 text-sm mb-6">
            Tenha acesso rápido direto da sua tela inicial, funcionamento offline e uma experiência de tela cheia.
          </p>

          <div className="space-y-4">
            {platform === 'ios' ? (
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">1</div>
                  <p className="text-sm text-slate-300">
                    Toque no ícone de <span className="inline-flex items-center bg-slate-700 px-1.5 py-0.5 rounded text-white mx-1"><Share size={14} /> Compartilhar</span> na barra inferior do Safari.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">2</div>
                  <p className="text-sm text-slate-300">
                    Role a lista e selecione <span className="font-bold text-white underline decoration-blue-500 underline-offset-4">Adicionar à Tela de Início</span>.
                  </p>
                </div>
              </div>
            ) : (
              <button 
                onClick={platform === 'android' ? handleAndroidInstall : onClose}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
              >
                {platform === 'android' ? <><Smartphone size={20} /> Instalar no Android</> : 'Entendi'}
              </button>
            )}
            
            <div className="flex items-center justify-center gap-2 py-2">
              <div className="h-[1px] flex-1 bg-slate-800" />
              <span className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">Smart Cart v1.2</span>
              <div className="h-[1px] flex-1 bg-slate-800" />
            </div>
            
            <p className="text-[10px] text-slate-500 text-center">
              Sem downloads pesados. Ocupa menos de 1MB de espaço.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE DE LOGO ---
const SmartCartLogo = ({ className = "h-12 w-auto", iconOnly = false }: { className?: string, iconOnly?: boolean }) => (
  <svg viewBox={iconOnly ? "0 0 60 60" : "0 0 280 60"} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="logo_grad" x1="0" y1="0" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#2563EB" />
      </linearGradient>
    </defs>
    <g transform="translate(10, 10)">
      <rect x="0" y="0" width="40" height="40" rx="10" fill="url(#logo_grad)" />
      <path d="M10 14 H14 L17 26 H29 L31 14" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="17" cy="30" r="2" fill="white"/><circle cx="28" cy="30" r="2" fill="white"/>
      <path d="M20 20 L22 22 L26 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </g>
    {!iconOnly && (
      <g transform="translate(60, 38)">
        <text fontFamily="sans-serif" fontWeight="800" fontSize="28" fill="white" letterSpacing="-0.5">SMART<tspan fill="#3B82F6" dx="5">CART</tspan></text>
      </g>
    )}
  </svg>
);

// --- ITEM DO CARRINHO COM SWIPE ---
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

  const handleTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; setIsDragging(true); };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDeleted) return;
    const delta = e.touches[0].clientX - startX.current;
    if (delta < 0) setOffsetX(Math.max(delta, -150));
  };
  const handleTouchEnd = () => {
    setIsDragging(false);
    if (offsetX < -100) {
      setOffsetX(-500); setIsDeleted(true);
      setTimeout(() => onDelete(item.id), 300);
    } else { setOffsetX(0); }
  };

  return (
    <div className={`relative mb-3 overflow-hidden rounded-xl transition-all duration-300 ${isDeleted ? 'h-0 mb-0 opacity-0' : 'h-auto opacity-100'}`}>
      <div className="absolute inset-0 bg-red-600 flex items-center justify-end pr-6 rounded-xl">
        <Trash2 size={24} className="text-white animate-pulse" />
      </div>
      <div 
        className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex justify-between items-center relative touch-pan-y"
        style={{ transform: `translateX(${offsetX}px)`, transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center gap-3 shrink-0 max-w-[70%]">
          <div className="w-12 h-12 bg-black rounded-lg shrink-0 overflow-hidden border border-slate-700 flex items-center justify-center">
            {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <ShoppingCart size={18} className="text-slate-600" />}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold text-slate-200 truncate">{item.name}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">{item.code}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
             <div className="text-sm font-bold text-blue-400">{formatCurrency(item.price * item.quantity)}</div>
             {item.quantity > 1 && <div className="text-[9px] text-slate-500">{item.quantity}x {formatCurrency(item.price)}</div>}
          </div>
          <ChevronRight size={16} className="text-slate-700" />
        </div>
      </div>
    </div>
  );
};

function App() {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('smart_cart_items');
    return saved ? JSON.parse(saved) : [];
  });
  const [history, setHistory] = useState<Purchase[]>(() => {
    const saved = localStorage.getItem('smart_cart_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [view, setView] = useState<'cart' | 'history' | 'settings'>('cart');
  const [isScanning, setIsScanning] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    localStorage.setItem('smart_cart_items', JSON.stringify(items));
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone);
  }, [items]);

  useEffect(() => { localStorage.setItem('smart_cart_history', JSON.stringify(history)); }, [history]);

  const total = useMemo(() => items.reduce((acc, item) => acc + (item.price * item.quantity), 0), [items]);
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  const handleScan = (code: string, image?: string) => { setIsScanning(false); setScannedCode(code); setScannedImage(image || null); };
  const handlePriceConfirm = (price: number, name: string, quantity: number) => {
    const newItem = { id: crypto.randomUUID(), code: scannedCode!, name, price, quantity, image: scannedImage || undefined, timestamp: Date.now() };
    setItems(prev => [newItem, ...prev]); setScannedCode(null); setScannedImage(null);
  };

  const generatePDF = async (purchaseItems: CartItem[], purchaseTotal: number, timestamp: number, purchaseId: string) => {
    try {
      const doc = new ((jsPDF as any).jsPDF || jsPDF)();
      doc.setFontSize(22); doc.setTextColor(37, 99, 235); doc.text("SMART CART", 14, 20);
      doc.setFontSize(10); doc.setTextColor(100); doc.text(`Cupom: ${purchaseId.slice(0, 8)} | Data: ${new Date(timestamp).toLocaleString('pt-BR')}`, 14, 30);
      autoTable(doc, {
        startY: 40,
        head: [['Produto', 'Qtd', 'Unit', 'Subtotal']],
        body: purchaseItems.map(i => [i.name, i.quantity, formatCurrency(i.price), formatCurrency(i.price * i.quantity)]),
        foot: [['', '', 'TOTAL', formatCurrency(purchaseTotal)]],
        theme: 'striped', headStyles: { fillColor: [37, 99, 235] }
      });
      doc.save(`SmartCart_${purchaseId.slice(0, 5)}.pdf`);
    } catch (e) { alert("Erro ao gerar PDF"); }
  };

  const confirmCheckout = async () => {
    const purchase = { id: crypto.randomUUID(), timestamp: Date.now(), total, itemCount: items.reduce((a, i) => a + i.quantity, 0), items: [...items] };
    setHistory(prev => [purchase, ...prev]);
    await generatePDF(purchase.items, purchase.total, purchase.timestamp, purchase.id);
    setItems([]); setIsCheckoutOpen(false); setView('history'); setExpandedHistoryId(purchase.id);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative max-w-md mx-auto shadow-2xl overflow-hidden border-x border-slate-800 safe-area-top safe-area-bottom">
      <InstallModal isOpen={isInstallModalOpen} onClose={() => setIsInstallModalOpen(false)} />

      <header className="bg-slate-900 shadow-lg sticky top-0 z-10 border-b border-slate-800">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="w-10 h-10 flex items-center justify-center">
            {view !== 'cart' && <button onClick={() => setView('cart')} className="p-2 text-slate-400"><ArrowLeft size={20} /></button>}
          </div>
          <SmartCartLogo className="h-9 w-auto drop-shadow-md" />
          <div className="w-10 h-10 flex items-center justify-center">
            {!isStandalone && (
              <button onClick={() => setIsInstallModalOpen(true)} className="p-2 text-blue-400 bg-blue-400/10 rounded-full border border-blue-400/20 animate-pulse">
                <Download size={20} />
              </button>
            )}
          </div>
        </div>
        <div className="p-2 flex items-center justify-between gap-2">
          <div className="flex bg-slate-800 p-1 rounded-xl flex-1">
             <button onClick={() => setView('cart')} className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 ${view === 'cart' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500'}`}><ShoppingCart size={14} />Carrinho</button>
             <button onClick={() => setView('history')} className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 ${view === 'history' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500'}`}><History size={14} />Histórico</button>
             <button onClick={() => setView('settings')} className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 ${view === 'settings' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500'}`}><Settings size={14} />Ajustes</button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-36 p-4">
        {view === 'cart' && (
          items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 mt-12">
              <SmartCartLogo className="h-20 w-auto mb-4 grayscale" iconOnly />
              <p className="text-slate-400">Escaneie produtos para começar</p>
            </div>
          ) : (
            <div className="space-y-1">
              {items.map(item => <SwipeableCartItem key={item.id} item={item} onDelete={id => setItems(p => p.filter(i => i.id !== id))} formatCurrency={formatCurrency} />)}
              <p className="text-center py-4 text-[10px] text-slate-600 font-bold uppercase tracking-widest">Arraste para remover</p>
            </div>
          )
        )}

        {view === 'history' && (
          <div className="space-y-4">
            {history.map(p => (
              <div key={p.id} className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <div onClick={() => setExpandedHistoryId(expandedHistoryId === p.id ? null : p.id)} className="p-4 flex justify-between items-center cursor-pointer">
                  <div><div className="text-sm font-bold text-white">{formatDate(p.timestamp)}</div><div className="text-xs text-slate-500">{p.itemCount} itens</div></div>
                  <div className="flex items-center gap-3"><div className="text-right font-bold text-green-400">{formatCurrency(p.total)}</div><ChevronRight size={16} className={`text-slate-700 transition-transform ${expandedHistoryId === p.id ? 'rotate-90' : ''}`} /></div>
                </div>
                {expandedHistoryId === p.id && (
                  <div className="px-4 pb-4 border-t border-slate-800 pt-3 space-y-2">
                    {p.items.map(i => <div key={i.id} className="flex justify-between text-xs"><span className="text-slate-400">{i.name}</span><span className="text-slate-500 font-bold">{formatCurrency(i.price * i.quantity)}</span></div>)}
                    <button onClick={() => generatePDF(p.items, p.total, p.timestamp, p.id)} className="w-full mt-4 py-3 bg-slate-800 text-blue-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2"><FileDown size={14} />Reemitir PDF</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {view === 'settings' && (
          <div className="space-y-4">
             <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 text-center">
                <div className="w-16 h-16 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
                   <SmartphoneNfc size={32} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Aplicativo Mobile</h3>
                <p className="text-sm text-slate-400 mb-6">Instale o Smart Cart no seu celular para uma experiência de shopping nativa.</p>
                <button onClick={() => setIsInstallModalOpen(true)} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"><Download size={20} />Instalar Agora</button>
             </div>
             <div className="space-y-2">
                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-between">
                   <div className="flex items-center gap-3"><div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400"><Info size={20} /></div><div><div className="text-sm font-bold text-white">Versão</div><div className="text-xs text-slate-500">1.2.0 (Build 2024)</div></div></div>
                   <div className="px-2 py-1 bg-green-500/10 text-green-500 text-[10px] font-bold rounded border border-green-500/20 uppercase tracking-widest">Atualizado</div>
                </div>
                <button onClick={() => { if(window.confirm('Deseja apagar todo o histórico de compras?')) setHistory([]); }} className="w-full p-4 bg-slate-900 rounded-2xl border border-slate-800 flex items-center gap-3 text-red-400 active:bg-red-500/5">
                   <div className="w-10 h-10 bg-red-400/10 rounded-xl flex items-center justify-center"><Trash2 size={20} /></div>
                   <span className="text-sm font-bold">Limpar Histórico</span>
                </button>
             </div>
          </div>
        )}
      </main>

      {view === 'cart' && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900 border-t border-slate-800 p-4 pb-8 z-20 flex flex-col gap-3 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
          <div className="flex justify-between items-end mb-2 px-1">
             <div><span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Subtotal</span><div className="text-2xl font-black text-white">{formatCurrency(total)}</div></div>
             <div className="text-right"><span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Produtos</span><div className="text-lg font-bold text-blue-400">{items.reduce((a, i) => a + i.quantity, 0)}</div></div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setIsScanning(true)} className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"><Scan size={22} /> Escanear</button>
            {items.length > 0 && (
              <button onClick={() => setIsCheckoutOpen(true)} className="flex-1 bg-green-600 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"><CheckCircle2 size={22} /> Finalizar</button>
            )}
          </div>
        </div>
      )}

      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950">
           <div className="bg-slate-900 p-4 flex items-center justify-between border-b border-slate-800"><button onClick={() => setIsCheckoutOpen(false)} className="p-2 text-slate-300"><ArrowLeft size={24} /></button><h2 className="text-lg font-bold text-white">Confirmação</h2><div className="w-10"></div></div>
           <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center">
              <div className="w-full bg-white text-slate-900 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                 <div className="text-center border-b border-dashed border-slate-300 pb-4 mb-4"><h3 className="font-black text-2xl tracking-tighter">SMART CART</h3><p className="text-xs text-slate-500 uppercase font-bold tracking-widest mt-1">Recibo Digital</p></div>
                 <div className="space-y-3 mb-8">{items.map(i => <div key={i.id} className="flex justify-between text-sm font-medium"><div className="flex-1"><div className="text-slate-800 truncate">{i.name}</div><div className="text-[10px] text-slate-400">{i.quantity}x {formatCurrency(i.price)}</div></div><div className="font-bold">{formatCurrency(i.price * i.quantity)}</div></div>)}</div>
                 <div className="border-t-2 border-slate-900 pt-4 flex justify-between items-center"><span className="font-bold text-slate-500">TOTAL</span><span className="text-3xl font-black">{formatCurrency(total)}</span></div>
              </div>
           </div>
           <div className="p-4 bg-slate-900 pb-10"><button onClick={confirmCheckout} className="w-full bg-blue-600 text-white font-bold py-5 rounded-3xl shadow-xl flex items-center justify-center gap-2 active:scale-95"><Printer size={22} /> Confirmar e Baixar PDF</button></div>
        </div>
      )}

      {isScanning && <Scanner onScan={handleScan} onClose={() => setIsScanning(false)} />}
      {scannedCode && <PriceInput code={scannedCode} image={scannedImage} onConfirm={handlePriceConfirm} onCancel={() => { setScannedCode(null); setScannedImage(null); }} />}
    </div>
  );
}

export default App;
