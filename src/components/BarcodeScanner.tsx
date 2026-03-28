"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Loader2 } from "lucide-react";
import { lookupBarcode } from "@/lib/barcode";

interface BarcodeScannerProps {
  onResult: (productName: string) => void;
  onClose: () => void;
}

type ScanState = "scanning" | "looking-up" | "found" | "not-found" | "error";

export default function BarcodeScanner({ onResult, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const detectedRef = useRef(false);
  const [scanState, setScanState] = useState<ScanState>("scanning");
  const [productName, setProductName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    detectedRef.current = false;
    setScanState("scanning");
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        startDetection();
      }
    } catch {
      setScanState("error");
      setErrorMsg("לא ניתן לגשת למצלמה. אנא אפשר גישה למצלמה בהגדרות הדפדפן.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  function startDetection() {
    if ("BarcodeDetector" in window) {
      startNativeDetector();
    } else {
      startZxingDetector();
    }
  }

  async function startNativeDetector() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detector = new (window as any).BarcodeDetector({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
    });

    async function detect() {
      if (detectedRef.current || !videoRef.current) return;
      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0 && !detectedRef.current) {
          detectedRef.current = true;
          stopCamera();
          await handleBarcode(barcodes[0].rawValue);
          return;
        }
      } catch {
        /* ignore per-frame errors */
      }
      animFrameRef.current = requestAnimationFrame(detect);
    }
    animFrameRef.current = requestAnimationFrame(detect);
  }

  async function startZxingDetector() {
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();

      const interval = setInterval(async () => {
        if (detectedRef.current || !videoRef.current) {
          clearInterval(interval);
          return;
        }
        try {
          const result = await reader.decodeFromVideoElement(videoRef.current);
          if (result && !detectedRef.current) {
            detectedRef.current = true;
            clearInterval(interval);
            stopCamera();
            await handleBarcode(result.getText());
          }
        } catch {
          /* no barcode in this frame — keep trying */
        }
      }, 300);
    } catch {
      setScanState("error");
      setErrorMsg("שגיאה בטעינת סורק הברקוד.");
    }
  }

  async function handleBarcode(barcode: string) {
    setScanState("looking-up");
    const name = await lookupBarcode(barcode);
    if (name) {
      setProductName(name);
      setScanState("found");
    } else {
      setScanState("not-found");
    }
  }

  function handleClose() {
    stopCamera();
    onClose();
  }

  async function handleRescan() {
    stopCamera();
    await startCamera();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">סרוק ברקוד מוצר</h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Camera preview */}
        {(scanState === "scanning" || scanState === "looking-up") && (
          <div className="relative bg-black" style={{ aspectRatio: "4/3" }}>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            {/* Corner markers */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-3/4 h-1/2">
                <span className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-sm" />
                <span className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-sm" />
                <span className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-sm" />
                <span className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-sm" />
              </div>
            </div>
          </div>
        )}

        {/* State messages */}
        <div className="p-4 space-y-3">
          {scanState === "scanning" && (
            <p className="text-center text-sm text-gray-500">
              כוון את המצלמה לברקוד של המוצר — הזיהוי אוטומטי
            </p>
          )}

          {scanState === "looking-up" && (
            <div className="flex items-center justify-center gap-2 py-2 text-gray-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>מחפש מוצר במאגר...</span>
            </div>
          )}

          {scanState === "found" && (
            <>
              <p className="text-center text-xs text-gray-400 uppercase tracking-wide">
                נמצא מוצר
              </p>
              <p className="text-center font-semibold text-lg leading-snug">
                {productName}
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleRescan}
                  className="flex-1 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  סרוק שוב
                </button>
                <button
                  onClick={() => onResult(productName)}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  הוסף לרשימה ✓
                </button>
              </div>
            </>
          )}

          {scanState === "not-found" && (
            <>
              <p className="text-center text-gray-500 text-sm">
                המוצר לא נמצא במאגר הישראלי
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleRescan}
                  className="flex-1 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  נסה שוב
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  הקלד ידנית
                </button>
              </div>
            </>
          )}

          {scanState === "error" && (
            <>
              <p className="text-center text-red-500 text-sm">{errorMsg}</p>
              <button
                onClick={handleClose}
                className="w-full py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                סגור
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
