
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Icon } from './icons';
import { useImageZoom } from '../hooks/useImageZoom';
import { useLanguage } from '../contexts/LanguageContext';

interface FullscreenViewerProps {
    imageUrl: string;
    onClose: () => void;
    onSaveAsVersion?: (dataUrl: string) => void;
}

interface FilterState {
  exposure: number;
  contrast: number;
  saturation: number;
  grain: number;
  clarity: number;
  dehaze: number;
  blur: number;
}

const initialFilters: FilterState = {
  exposure: 100,
  contrast: 100,
  saturation: 100,
  grain: 0,
  clarity: 0,
  dehaze: 0,
  blur: 0,
};

const FilterSlider: React.FC<{ label: string; value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; min: number; max: number; step?: number; }> = ({ label, value, onChange, min, max, step = 1 }) => (
  <div className="flex-1 min-w-[120px]">
    <div className="flex justify-between items-center text-[10px] mb-1">
      <label htmlFor={`${label}-slider`} className="text-zinc-400 font-bold uppercase tracking-widest">{label}</label>
      <input
        type="number"
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        aria-label={`${label} value`}
        className="w-12 text-right bg-zinc-900 px-1 py-0.5 rounded text-orange-500 font-mono text-[10px] focus:ring-1 focus:ring-orange-500 focus:outline-none border border-zinc-800"
      />
    </div>
    <input
      id={`${label}-slider`}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={onChange}
      aria-label={label}
      className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-600"
    />
  </div>
);

export const FullscreenViewer: React.FC<FullscreenViewerProps> = ({ imageUrl, onClose, onSaveAsVersion }) => {
    const { t } = useLanguage();
    const { zoomState, panningRef, handleWheel, handleMouseDown, handleMouseMove, handleMouseUp } = useImageZoom();
    const [filters, setFilters] = useState<FilterState>(initialFilters);
    const [isSaving, setIsSaving] = useState(false);
    const imageRef = useRef<HTMLImageElement>(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        const checkSize = () => setIsMobile(window.innerWidth < 1024);
        
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', checkSize);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', checkSize);
        };
    }, [onClose]);
    
    const handleFilterChange = (filterName: keyof FilterState, min: number, max: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        let newValue = rawValue === '' ? min : Number(rawValue);
        newValue = Math.max(min, Math.min(newValue, max));
        setFilters(prev => ({ ...prev, [filterName]: newValue }));
    };

    const resetFilters = () => {
        setFilters(initialFilters);
    };

    const buildFilterString = useMemo(() => {
        const finalContrast = filters.contrast + (filters.clarity / 2) + (filters.dehaze / 2);
        const finalExposure = filters.exposure - (filters.dehaze / 4);

        return [
            `brightness(${finalExposure}%)`,
            `contrast(${finalContrast}%)`,
            `saturate(${filters.saturation}%)`,
            `blur(${filters.blur}px)`,
        ].join(' ');
    }, [filters]);

    const handleSaveVersion = async () => {
        const img = imageRef.current;
        if (!img || !onSaveAsVersion) return;
    
        setIsSaving(true);
        try {
            const response = await fetch(img.src);
            if (!response.ok) throw new Error('Network response was not ok');
            const blob = await response.blob();
            const objectURL = URL.createObjectURL(blob);
    
            const imageToDraw = new Image();
            imageToDraw.onload = async () => {
                const canvas = document.createElement('canvas');
                canvas.width = imageToDraw.naturalWidth;
                canvas.height = imageToDraw.naturalHeight;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });

                if (!ctx) {
                    URL.revokeObjectURL(objectURL);
                    setIsSaving(false);
                    return;
                }
    
                ctx.filter = buildFilterString;
                ctx.drawImage(imageToDraw, 0, 0, canvas.width, canvas.height);
                
                if (filters.grain > 0) {
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;
                    const grainAmount = filters.grain * 2;
                    for (let i = 0; i < data.length; i += 4) {
                        const noise = (Math.random() - 0.5) * grainAmount;
                        data[i] = Math.max(0, Math.min(255, data[i] + noise));
                        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
                        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
                    }
                    ctx.putImageData(imageData, 0, 0);
                }
    
                const finalDataUrl = canvas.toDataURL('image/png');
                await onSaveAsVersion(finalDataUrl);
                URL.revokeObjectURL(objectURL);
                setIsSaving(false);
                onClose(); // Tự động đóng sau khi lưu thành công
            };
    
            imageToDraw.onerror = () => {
                URL.revokeObjectURL(objectURL);
                setIsSaving(false);
                alert('Could not load the image for processing.');
            };
            
            imageToDraw.src = objectURL;
    
        } catch (error) {
            console.error('Error processing version:', error);
            alert('Lỗi khi lưu phiên bản mới. Vui lòng thử lại.');
            setIsSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex items-center justify-center p-0 transition-opacity duration-300"
            onClick={onClose}
        >
            <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="absolute top-6 left-6 text-white/40 hover:text-white transition-colors z-[52] flex items-center gap-2 group"
                aria-label={t('closeFullscreen')}
            >
                <Icon name="arrow-uturn-left" className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">Quay lại Studio</span>
            </button>

            <div className="relative w-full h-full flex items-center justify-center p-4 lg:pr-[320px]" onClick={e => e.stopPropagation()}>
               <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                    <img
                        ref={imageRef}
                        src={imageUrl}
                        alt="Fullscreen Render"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-[0_0_100px_rgba(0,0,0,0.5)]"
                        onWheel={handleWheel}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        style={{
                            transform: `translate(${zoomState.x}px, ${zoomState.y}px) scale(${zoomState.scale})`,
                            cursor: zoomState.scale > 1 ? (panningRef.current.isPanning ? 'grabbing' : 'grab') : 'default',
                            transition: panningRef.current.isPanning ? 'none' : 'transform 0.1s ease-out',
                            willChange: 'transform',
                            filter: buildFilterString,
                        }}
                    />
                    <svg className="absolute w-0 h-0">
                        <defs>
                            <filter id="grainy">
                                <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
                                <feColorMatrix type="saturate" values="0"/>
                            </filter>
                        </defs>
                    </svg>
                    <div
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{
                            transform: `translate(${zoomState.x}px, ${zoomState.y}px) scale(${zoomState.scale})`,
                            filter: 'url(#grainy)',
                            opacity: filters.grain / 150,
                            mixBlendMode: 'overlay',
                            transition: panningRef.current.isPanning ? 'none' : 'transform 0.1s ease-out',
                        }}
                    ></div>
                </div>
            </div>

            <div
                className={`absolute bg-[#0c0c0e] border border-white/10 shadow-2xl z-[51] transition-all duration-500
                    ${isMobile 
                        ? 'bottom-0 left-0 right-0 p-6 rounded-t-[2.5rem]' 
                        : 'right-0 top-0 bottom-0 w-80 p-8 flex flex-col'
                    }`}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center pb-6 mb-6 border-b border-white/5">
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-tighter italic">Studio <span className="text-orange-600">Editor</span></h3>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Tinh chỉnh hậu kỳ</p>
                    </div>
                    <button onClick={resetFilters} className="text-[10px] font-black text-zinc-500 hover:text-orange-500 uppercase tracking-widest transition-colors">{t('reset')}</button>
                </div>
                
                <div className={`grid gap-6 overflow-y-auto thin-scrollbar pr-2 ${isMobile ? 'grid-cols-2' : 'flex-grow'}`}>
                    <FilterSlider label="Exposure" value={filters.exposure} onChange={handleFilterChange('exposure', 0, 200)} min={0} max={200} />
                    <FilterSlider label="Contrast" value={filters.contrast} onChange={handleFilterChange('contrast', 0, 200)} min={0} max={200} />
                    <FilterSlider label="Saturation" value={filters.saturation} onChange={handleFilterChange('saturation', 0, 200)} min={0} max={200} />
                    <FilterSlider label="Blur" value={filters.blur} onChange={handleFilterChange('blur', 0, 20)} min={0} max={20} />
                    <FilterSlider label="Grain" value={filters.grain} onChange={handleFilterChange('grain', 0, 100)} min={0} max={100} />
                    <FilterSlider label="Clarity" value={filters.clarity} onChange={handleFilterChange('clarity', 0, 100)} min={0} max={100} />
                    <FilterSlider label="Dehaze" value={filters.dehaze} onChange={handleFilterChange('dehaze', 0, 100)} min={0} max={100} />
                </div>
                
                <button
                  onClick={handleSaveVersion}
                  disabled={isSaving}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-3 mt-8 shadow-xl shadow-orange-900/20 active:scale-95 transition-all uppercase tracking-widest text-xs disabled:bg-zinc-800 disabled:text-zinc-600 disabled:shadow-none"
                >
                    {isSaving ? (
                        <Icon name="sparkles" className="w-5 h-5 animate-spin" />
                    ) : (
                        <Icon name="arrow-up-tray" className="w-5 h-5" />
                    )}
                    {isSaving ? 'Đang lưu...' : 'Lưu phiên bản mới'}
                </button>
            </div>
        </div>
    );
};
