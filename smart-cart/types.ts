export interface CartItem {
  id: string;
  code: string;
  name: string;
  price: number;
  quantity: number;
  image?: string; // Base64 snapshot
  timestamp: number;
}

export interface Purchase {
  id: string;
  timestamp: number;
  total: number;
  itemCount: number;
  items: CartItem[];
}

export interface ScannerProps {
  onScan: (code: string, image?: string) => void;
  onClose: () => void;
}

export interface PriceInputProps {
  code: string;
  image?: string | null;
  onConfirm: (price: number, name: string, quantity: number) => void;
  onCancel: () => void;
}