
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ShoppingCart, Scan, Trash2, Receipt, History, ChevronRight, CheckCircle2, FileDown, X, ArrowLeft, Printer, Share, Smartphone, Download } from 'lucide-react';
import Scanner from './components/Scanner';
import PriceInput from './components/PriceInput';
import { CartItem, Purchase } from './types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

// --- INSTALLATION GUIDE COMPONENT ---
const InstallGuide = () => {
  const [showInstall, setShowInstall] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if already in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    
    if (isStandalone) return;

    // Detect Platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);

    if (isIos) setPlatform('ios');
    else if (isAndroid) setPlatform('android');

    // Android-specific: capture the install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    });

    // iOS: Show guide after 3 seconds of inactivity
    if (isIos) {
      setTimeout(() => setShowInstall(true), 3000);
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstall(false);
    }
    setDeferredPrompt(null);
  };

  if (!showInstall) return null;

  return (
    <div className="fixed inset-x-4 bottom-24 z-[60] animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-slate-900/90 backdrop-blur-xl border border-blue-500/30 p-5 rounded-3xl shadow-2xl flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="flex gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Smartphone className="text-white" size={24} />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Instalar Smart Cart</h4>
              <p className="text-slate-400 text-[11px] leading-tight mt-1">
                Adicione à sua tela de início para uma experiência completa e offline.
              </p>
            </div>
          </div>
          <button onClick={() => setShowInstall(false)} className="p-1 text-slate-500">
            <X size={18} />
          </button>
        </div>

        {platform === 'ios' ? (
          <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
            <p className="text-xs text-slate-300 flex items-center flex-wrap gap-2">
              Toque em <Share size={14} className="text-blue-400" /> 
              <span>"Compartilhar" e depois em</span>
              <span className="font-bold text-white flex items-center gap-1 bg-slate-700 px-2 py-0.5 rounded">
                Adicionar à Tela de Início
              </span>
            </p>
          </div>
        ) : platform === 'android' ? (
          <button 
            onClick={handleInstallClick}
            className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg"
          >
            <Download size={18} />
            Instalar Agora
          </button>
        ) : (
          <p className="text-xs text-slate-400 text-center italic">Acesse pelo Chrome ou Safari para instalar.</p>
        )}
      </div>
    </div>
  );
};

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
      <path d="M20 20 L22 22 L26 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin