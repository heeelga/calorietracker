import { useEffect, useRef, useState } from 'react'
import { X, Camera } from 'lucide-react'
import { BrowserMultiFormatReader } from '@zxing/library'

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(true)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader

    const startScan = async () => {
      try {
        if (!videoRef.current) return

        await reader.decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
          if (result && scanning) {
            setScanning(false)
            onScan(result.getText())
          }
          if (err && err.name !== 'NotFoundException') {
            console.warn('Scan error:', err)
          }
        })
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === 'NotAllowedError') {
            setError('Kamera-Zugriff verweigert. Bitte erlauben Sie den Kamera-Zugriff.')
          } else {
            setError('Kamera konnte nicht gestartet werden.')
          }
        }
      }
    }

    startScan()

    return () => {
      reader.reset()
    }
  }, [onScan, scanning])

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/80">
        <div className="flex items-center gap-2 text-white">
          <Camera size={20} />
          <span className="font-medium">Barcode scannen</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Camera view */}
      <div className="flex-1 relative flex items-center justify-center">
        {error ? (
          <div className="text-center p-6">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-green-500 text-white rounded-xl font-semibold"
            >
              Schließen
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
            />
            {/* Scan overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-32 relative">
                {/* Corner markers */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-green-400" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-green-400" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-green-400" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-green-400" />
                {/* Scan line animation */}
                <div className="absolute inset-x-0 top-0 h-0.5 bg-green-400/70 animate-bounce" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer hint */}
      {!error && (
        <div className="p-4 bg-black/80 text-center text-sm text-gray-400">
          Richten Sie die Kamera auf den Barcode des Produkts
        </div>
      )}
    </div>
  )
}
