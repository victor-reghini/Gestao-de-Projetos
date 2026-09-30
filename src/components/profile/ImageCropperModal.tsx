import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  RotateCcw, 
  RotateCcw as ResetIcon, 
  Check, 
  Crop, 
  Loader2,
  Move
} from 'lucide-react';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedFile: File) => Promise<void>;
  loading?: boolean;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  loading = false
}) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Constants for editor viewport
  const VIEWPORT_SIZE = 320;
  const CROP_RADIUS = 130; // 260px diameter circle

  // Load image when imageSrc changes
  useEffect(() => {
    if (!imageSrc || !isOpen) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc, isOpen]);

  // Draw the cropper viewport on canvas
  const drawMainCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Save state for transformation
    ctx.save();

    // 1. Move origin to center of viewport
    ctx.translate(centerX + offset.x, centerY + offset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Calculate aspect ratio fit
    const scale = Math.max((CROP_RADIUS * 2) / image.width, (CROP_RADIUS * 2) / image.height);
    const drawW = image.width * scale;
    const drawH = image.height * scale;

    ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);

    ctx.restore();

    // 2. Draw darkened overlay outside the circle
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, 0, width, height);

    // Cut out circular hole
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(centerX, centerY, CROP_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Restore composite operation for border and grid
    ctx.globalCompositeOperation = 'source-over';

    // 3. Draw circle border
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(centerX, centerY, CROP_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    // 4. Draw subtle rule-of-thirds grid inside circle
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    const r = CROP_RADIUS;
    // Clip to circle so dashed lines don't leak outside
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, CROP_RADIUS, 0, Math.PI * 2);
    ctx.clip();

    // Grid lines
    ctx.beginPath();
    ctx.moveTo(centerX - r / 3, centerY - r);
    ctx.lineTo(centerX - r / 3, centerY + r);
    ctx.moveTo(centerX + r / 3, centerY - r);
    ctx.lineTo(centerX + r / 3, centerY + r);

    ctx.moveTo(centerX - r, centerY - r / 3);
    ctx.lineTo(centerX + r, centerY - r / 3);
    ctx.moveTo(centerX - r, centerY + r / 3);
    ctx.lineTo(centerX + r, centerY + r / 3);
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  }, [image, zoom, rotation, offset]);

  // Update preview canvas (round 80x80)
  const drawPreview = useCallback(() => {
    const preview = previewCanvasRef.current;
    if (!preview || !image) return;

    const ctx = preview.getContext('2d');
    if (!ctx) return;

    const size = preview.width; // 80px
    ctx.clearRect(0, 0, size, size);

    // Circular clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();

    // Calculate ratio relative to editor
    const ratio = (size / 2) / CROP_RADIUS;

    ctx.translate(size / 2 + offset.x * ratio, size / 2 + offset.y * ratio);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom * ratio, zoom * ratio);

    const scale = Math.max((CROP_RADIUS * 2) / image.width, (CROP_RADIUS * 2) / image.height);
    const drawW = image.width * scale;
    const drawH = image.height * scale;

    ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }, [image, zoom, rotation, offset]);

  useEffect(() => {
    drawMainCanvas();
    drawPreview();
  }, [drawMainCanvas, drawPreview]);

  // Mouse Drag Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Handlers for mobile responsiveness
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom((prev) => Math.min(Math.max(0.5, prev + delta), 3.5));
  };

  // Rotate 90 degrees
  const handleRotate = (deg: number) => {
    setRotation((prev) => (prev + deg) % 360);
  };

  // Reset to default
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  // Export cropped avatar
  const handleConfirmCrop = async () => {
    if (!image) return;

    // Create a high-resolution 400x400 output canvas
    const outputCanvas = document.createElement('canvas');
    const OUTPUT_SIZE = 400;
    outputCanvas.width = OUTPUT_SIZE;
    outputCanvas.height = OUTPUT_SIZE;

    const ctx = outputCanvas.getContext('2d');
    if (!ctx) return;

    // Smooth image rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const ratio = (OUTPUT_SIZE / 2) / CROP_RADIUS;

    ctx.translate(OUTPUT_SIZE / 2 + offset.x * ratio, OUTPUT_SIZE / 2 + offset.y * ratio);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom * ratio, zoom * ratio);

    const scale = Math.max((CROP_RADIUS * 2) / image.width, (CROP_RADIUS * 2) / image.height);
    const drawW = image.width * scale;
    const drawH = image.height * scale;

    ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);

    // Convert to Blob
    outputCanvas.toBlob(
      async (blob) => {
        if (!blob) return;
        const croppedFile = new File([blob], `avatar-${Date.now()}.png`, {
          type: 'image/png',
          lastModified: Date.now()
        });

        await onCropComplete(croppedFile);
      },
      'image/png',
      0.95
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Editar Foto de Perfil</h2>
              <p className="text-xs text-slate-400">Arraste para ajustar a posição e use o zoom para o encaixe ideal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cropper Viewport */}
        <div className="mt-5 flex flex-col items-center">
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner cursor-grab active:cursor-grabbing select-none">
            <canvas
              ref={canvasRef}
              width={VIEWPORT_SIZE}
              height={VIEWPORT_SIZE}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
              className="block"
            />

            <div className="absolute top-2.5 left-2.5 px-2 py-1 rounded-md bg-slate-900/80 backdrop-blur-sm border border-slate-700/60 text-[10px] text-slate-300 flex items-center gap-1 pointer-events-none">
              <Move className="w-3 h-3 text-indigo-400" />
              <span>Arraste para mover</span>
            </div>
          </div>

          {/* Controls: Zoom slider & buttons */}
          <div className="w-full mt-4 space-y-3">
            <div className="flex items-center justify-between gap-3 px-2">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Reduzir zoom"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <input
                type="range"
                min="0.5"
                max="3.5"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />

              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3.5, z + 0.15))}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Aumentar zoom"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <span className="text-xs font-mono text-slate-400 w-12 text-right">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Quick Actions: Rotate & Reset & Live Preview */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 px-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleRotate(-90)}
                  className="btn btn-secondary btn-sm text-xs py-1 px-2.5 flex items-center gap-1 text-slate-300"
                  title="Girar 90° para esquerda"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> -90°
                </button>
                <button
                  type="button"
                  onClick={() => handleRotate(90)}
                  className="btn btn-secondary btn-sm text-xs py-1 px-2.5 flex items-center gap-1 text-slate-300"
                  title="Girar 90° para direita"
                >
                  <RotateCw className="w-3.5 h-3.5" /> +90°
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn btn-ghost btn-sm text-xs py-1 px-2 text-slate-400 hover:text-white"
                  title="Restaurar posição original"
                >
                  <ResetIcon className="w-3.5 h-3.5" /> Reset
                </button>
              </div>

              {/* Preview Thumbnail */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-medium">Prévia:</span>
                <canvas
                  ref={previewCanvasRef}
                  width={44}
                  height={44}
                  className="rounded-full border-2 border-indigo-500 shadow-md bg-slate-950 block"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-5 mt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn btn-ghost"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmCrop}
            disabled={loading}
            className="btn btn-primary flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Recortar e Salvar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
