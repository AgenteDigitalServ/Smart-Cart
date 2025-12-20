import React, { useCallback, useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { X, Zap, ZapOff, ScanLine } from 'lucide-react';

// Define the shape of the BarcodeDetector API (experimental)
declare global {
  class BarcodeDetector {
    constructor(options?: { formats: string[] });
    detect(image: ImageBitmapSource): Promise<Array<{ rawValue: string; format: string }>>;
    static getSupportedFormats(): Promise<string[]>;
  }
}

interface ScannerProps {
  onScan: (code: string, image?: string) => void;
  onClose: () => void;
}

const Scanner: React.FC<ScannerProps> = ({ onScan, onClose }) => {
  const webcamRef = useRef<Webcam>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasDetector, setHasDetector] = useState<boolean>(false);
  const scanInterval = useRef<number | null>(null);

  // Initialize Barcode Detector logic
  useEffect(() => {
    const checkDetector = async () => {
      if ('BarcodeDetector' in window) {
        setHasDetector(true);
      } else {
        console.warn('BarcodeDetector API not available in this browser.');
      }
    };
    checkDetector();
    
    return () => {
      if (scanInterval.current) window.clearInterval(scanInterval.current);
    };
  }, []);

  const captureAndDetect = useCallback(async () => {
    if (!webcamRef.current || !webcamRef.current.video) return;

    const video = webcamRef.current.video;
    
    // Ensure video is ready
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    try {
      if ('BarcodeDetector' in window) {
        const detector = new BarcodeDetector({ formats: ['qr_code', 'ean_13', 'ean_8'] });
        const barcodes = await detector.detect(video);
        
        if (barcodes.length > 0) {
          const code = barcodes[0].rawValue;
          // Capture snapshot
          const imageSrc = webcamRef.current.getScreenshot();
          onScan(code, imageSrc || undefined);
        }
      }
    } catch (err) {
      console.error("Detection failed", err);
    }
  }, [onScan]);

  // Start scanning loop
  useEffect(() => {
    if (hasDetector) {
      scanInterval.current = window.setInterval(captureAndDetect, 500);
    }
    return () => {
      if (scanInterval.current) window.clearInterval(scanInterval.current);
    };
  }, [hasDetector, captureAndDetect]);

  const toggleTorch = useCallback(() => {
    setTorchOn((prev) => !prev);
    const stream = webcamRef.current?.video?.srcObject as MediaStream;
    if (stream) {
      const track = stream.getVideoTracks()[0];
      if (track && track.getCapabilities && (track.getCapabilities() as any).torch) {
        track.applyConstraints({
          advanced: [{ torch: !torchOn } as any]
        }).catch(e => console.error("Torch error", e));
      }
    }
  }, [torchOn]);

  const simulateScan = () => {
    const mockCodes = ['7891000100103', '7894900011517', '7896005800009', 'SAMPLE-QR-CODE'];
    const randomCode = mockCodes[Math.floor(Math.random() * mockCodes.length)];
    // No image for simulation
    onScan(randomCode, undefined);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
      {/* Header / Controls */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-slate-900/80 to-transparent">
        <button 
          onClick={onClose}
          className="p-3 bg-slate-800/50 backdrop-blur-md rounded-full text-white hover:bg-slate-700/50 transition-colors border border-slate-700/30"
        >
          <X size={24} />
        </button>
        <div className="text-white font-medium text-lg tracking-wide drop-shadow-md">Scanner</div>
        <button 
          onClick={toggleTorch}
          className={`p-3 backdrop-blur-md rounded-full text-white transition-colors border border-slate-700/30 ${torchOn ? 'bg-yellow-500/20 text-yellow-300' : 'bg-slate-800/50 hover:bg-slate-700/50'}`}
        >
          {torchOn ? <Zap size={24} fill="currentColor" /> : <ZapOff size={24} />}
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative flex items-center justify-center bg-slate-950 overflow-hidden">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            facingMode: { exact: "environment" } // Prefer back camera
          }}
          className="absolute inset-0 w-full h-full object-cover opacity-80"
          onUserMediaError={(e) => {
            console.error(e);
            setError("Acesso à câmera não disponível. Use o botão de simulação.");
          }}
        />

        {/* Scan Frame Overlay */}
        <div className="relative w-72 h-72 border-2 border-blue-400/50 rounded-2xl flex flex-col items-center justify-center shadow-[0_0_0_1000px_rgba(15,23,42,0.6)]">
          <div className="absolute inset-0 border-2 border-blue-400 rounded-2xl animate-pulse opacity-50"></div>
          <ScanLine className="text-red-500 animate-bounce mt-4 drop-shadow-lg" size={48} />
          <p className="mt-20 text-white/90 text-sm font-medium bg-slate-900/60 px-4 py-1.5 rounded-full backdrop-blur-sm border border-slate-700/50">
            Alinhe o código na moldura
          </p>
        </div>

        {/* Error / Fallback UI */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950 p-6 text-center z-20">
            <div className="text-white max-w-xs">
              <p className="mb-4 text-red-400 font-medium">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer / Simulation */}
      <div className="p-6 bg-slate-900 pb-10 flex flex-col gap-3 border-t border-slate-800">
         <button 
           onClick={simulateScan}
           className="w-full py-4 bg-slate-800 text-blue-200 border border-slate-700 rounded-xl font-semibold active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-slate-700"
         >
           <ScanLine size={20} />
           Simular Leitura (Debug)
         </button>
         {!hasDetector && !error && (
           <p className="text-xs text-slate-500 text-center">
             Leitura nativa não suportada neste navegador. Usando modo simulação.
           </p>
         )}
      </div>
    </div>
  );
};

export default Scanner;