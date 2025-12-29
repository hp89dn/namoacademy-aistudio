
import React, { useState, useRef, useEffect } from 'react';
import type { Project, ActiveTab, SourceImage, Version } from '../types';
import { Icon } from './icons';
import { sourceImageToDataUrl, dataUrlToSourceImage } from '../utils';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { generateSketch } from '../services/geminiService';
import { fetchProjectVersions, saveVersionToCloud } from '../services/firebaseService';

interface ToolSelectionScreenProps {
  project: Project;
  onSelectTool: (tab: ActiveTab, utility?: any, customInitialImage?: SourceImage) => void;
  onBack: () => void;
}

const BeforeAfterSlider: React.FC<{ before: string; after: string }> = ({ before, after }) => {
    const [sliderPos, setSliderPos] = useState(50);
    const containerRef = useRef<HTMLDivElement>(null);
  
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const newSliderPos = (x / rect.width) * 100;
        setSliderPos(Math.max(0, Math.min(100, newSliderPos)));
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.touches[0].clientX - rect.left;
        const newSliderPos = (x / rect.width) * 100;
        setSliderPos(Math.max(0, Math.min(100, newSliderPos)));
    };
  
    return (
        <div 
            ref={containerRef}
            className="relative w-full aspect-video select-none overflow-hidden rounded-2xl border border-zinc-800 shadow-2xl"
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
        >
            <img src={before} alt="Before" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 w-full h-full overflow-hidden" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
                <img src={after} alt="After" className="absolute inset-0 w-full h-full object-cover" />
            </div>
            <div className="absolute inset-y-0 bg-white/50 w-1 cursor-ew-resize z-20" style={{ left: `${sliderPos}%` }}>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-xl border border-zinc-200">
                    <Icon name="arrows-pointing-out" className="w-4 h-4 text-black rotate-90" />
                </div>
            </div>
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] font-black text-white uppercase tracking-widest border border-white/10">Ảnh gốc</div>
            <div className="absolute top-4 right-4 bg-orange-600/80 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] font-black text-white uppercase tracking-widest border border-orange-500/30">Bản Sketch</div>
        </div>
    );
};

export const ToolSelectionScreen: React.FC<ToolSelectionScreenProps> = ({ project, onSelectTool, onBack }) => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();

  const [projectVersions, setProjectVersions] = useState<Version[]>([]);
  const [isCheckingVersions, setIsCheckingVersions] = useState(true);

  const [sketchModal, setSketchModal] = useState<{
      isOpen: boolean;
      toolId: ActiveTab;
      utilityId?: any;
      isGenerating: boolean;
      sketchImage: SourceImage | null;
      mode: 'confirm' | 'choice';
  }>({
      isOpen: false,
      toolId: 'create',
      isGenerating: false,
      sketchImage: null,
      mode: 'confirm'
  });

  useEffect(() => {
    const loadVersions = async () => {
        try {
            const list = await fetchProjectVersions(project.id);
            setProjectVersions(list);
        } catch (err) {
            console.error("Failed to load project versions for sketch check:", err);
        } finally {
            setIsCheckingVersions(false);
        }
    };
    loadVersions();
  }, [project.id]);

  const existingSketch = projectVersions.find(v => v.tab === 'sketch');

  const handleToolClick = (toolId: ActiveTab, utilityId?: any) => {
      if (toolId === 'create' || toolId === 'interior') {
          if (existingSketch) {
              setSketchModal({
                  isOpen: true,
                  toolId,
                  utilityId,
                  isGenerating: false,
                  sketchImage: dataUrlToSourceImage(existingSketch.image),
                  mode: 'choice'
              });
          } else {
              setSketchModal({
                  isOpen: true,
                  toolId,
                  utilityId,
                  isGenerating: false,
                  sketchImage: null,
                  mode: 'confirm'
              });
          }
      } else {
          onSelectTool(toolId, utilityId);
      }
  };

  const handleNoSketch = () => {
      onSelectTool(sketchModal.toolId, sketchModal.utilityId, project.baseImage || undefined);
  };

  const handleYesSketch = async () => {
      if (!project.baseImage) return;
      setSketchModal(prev => ({ ...prev, isGenerating: true }));
      try {
          const results = await generateSketch(project.baseImage, language as 'vi' | 'en');
          if (results && results.length > 0) {
              const sketch = dataUrlToSourceImage(results[0]);
              if (sketch && (sketch.base64 || sketch.url)) {
                  await saveVersionToCloud({
                      projectId: project.id,
                      parentId: null,
                      tab: 'sketch',
                      image: results[0],
                      prompt: 'Bản vẽ phác thảo kiến trúc (Sketch)',
                      metadata: { isAutoGenerated: true },
                      createdAt: Date.now()
                  });
              }
              setSketchModal(prev => ({ ...prev, isGenerating: false, sketchImage: sketch }));
          } else {
              throw new Error("Sketch generation failed");
          }
      } catch (err) {
          console.error(err);
          alert(t('alertImageGenFailedRetry'));
          setSketchModal(prev => ({ ...prev, isGenerating: false }));
      }
  };

  const handleContinueToStudio = () => {
      onSelectTool(sketchModal.toolId, sketchModal.utilityId, sketchModal.sketchImage || undefined);
  };

  const allTools: { id: ActiveTab; utilityId?: any; icon: string; title: string; desc: string; color: string; highlight?: boolean }[] = [
    { id: 'create', icon: 'globe', title: t('tabCreate'), desc: 'Phối cảnh ngoại thất.', color: 'bg-blue-600' },
    { id: 'interior', icon: 'sparkles', title: t('tabInterior'), desc: 'Không gian nội thất.', color: 'bg-purple-600' },
    { id: 'cameraAngle', icon: 'camera', title: t('tabCameraAngle'), desc: 'Góc máy chuyên nghiệp.', color: 'bg-orange-600' },
    { id: 'edit', icon: 'pencil-swoosh', title: t('tabEdit'), desc: 'Hậu kỳ & chỉnh sửa.', color: 'bg-red-600' },
    { id: 'utilities', utilityId: 'moodboard', icon: 'clipboard', title: t('moodboardTitle'), desc: 'Bảng vật liệu ý tưởng.', color: 'bg-pink-600' },
    { id: 'utilities', utilityId: 'lighting', icon: 'sparkles', title: t('lightingTitle'), desc: 'Ánh sáng kỹ thuật số.', color: 'bg-amber-600' },
    { id: 'utilities', utilityId: 'virtualTour', icon: 'globe', title: t('virtualTourTitle'), desc: 'Dạo bước không gian AI.', color: 'bg-emerald-600' },
    { id: 'canva', icon: 'arrow-up-tray', title: t('canvaMixTitle'), desc: 'Mix đồ decor nội thất.', color: 'bg-indigo-600' },
    { id: 'utilities', utilityId: 'extendView', icon: 'arrows-pointing-out', title: t('extendViewTitle'), desc: 'Mở rộng bối cảnh.', color: 'bg-sky-600' },
    { id: 'utilities', utilityId: 'changeStyle', icon: 'cpu-chip', title: t('changeStyleTitle'), desc: 'Redesign phong cách.', color: 'bg-rose-600' },
    { id: 'planTo3d', icon: 'clipboard', title: t('tabPlanTo3D'), desc: 'Dựng phối cảnh 2D.', color: 'bg-teal-600' },
    { id: 'video', icon: 'video-camera', title: t('tabCreateVideo'), desc: 'Tạo Motion Graphics.', color: 'bg-cyan-600' },
    { id: 'editorBeta', icon: 'pencil-swoosh', title: t('tabEditorBeta'), desc: 'Studio hậu kỳ sâu.', color: 'bg-slate-600' },
    { id: 'library', icon: 'heart', title: t('library'), desc: 'Tủ hồ sơ tác phẩm.', color: 'bg-pink-500' },
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 lg:p-8">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-lg animate-fade-in" 
        onClick={onBack}
      ></div>

      {/* Modal Container */}
      <div className={`relative z-10 w-full max-w-6xl max-h-[90vh] bg-[#0c0c0e] border border-white/10 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-zoom-in`}>
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-8 border-b border-white/5">
            <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-orange-900/40 shrink-0 border border-white/10">
                    <Icon name="sparkles" className="w-7 h-7 text-white" />
                </div>
                <div className="flex flex-col">
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none mb-1.5">
                      Hộp Công Cụ <span className="text-orange-600">AI</span>
                    </h2>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.3em]">Hệ sinh thái sáng tạo kiến trúc chuyên nghiệp</p>
                </div>
            </div>
            
            <button 
                onClick={onBack}
                className="w-10 h-10 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all shadow-xl"
            >
                <Icon name="x-circle" className="w-6 h-6" />
            </button>
        </div>

        {/* Modal Content - Tools Grid */}
        <div className="flex-grow overflow-y-auto thin-scrollbar p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {allTools.map((tool, idx) => (
                    <button
                        key={idx}
                        disabled={isCheckingVersions}
                        onClick={() => handleToolClick(tool.id, tool.utilityId)}
                        className={`group relative text-left py-4 px-4 min-h-[85px] rounded-2xl bg-zinc-900/40 hover:bg-zinc-800 transition-all duration-300 border border-white/[0.03] hover:border-orange-500/40 flex items-center gap-4 overflow-hidden shadow-lg ${isCheckingVersions ? 'opacity-50 cursor-wait' : ''}`}
                    >
                        {/* Compact Icon */}
                        <div className={`w-10 h-10 ${tool.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500 shrink-0 border border-white/5`}>
                            <Icon name={tool.icon} className="w-5 h-5 text-white" />
                        </div>
                        
                        <div className="relative z-10 flex flex-col justify-center min-w-0 flex-grow">
                            <h3 className="text-[12px] font-black text-white uppercase tracking-tight mb-0.5 group-hover:text-orange-500 transition-colors truncate">
                                {tool.title}
                            </h3>
                            <p className="text-zinc-500 text-[9px] font-bold leading-tight line-clamp-1 uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">
                                {tool.desc}
                            </p>
                        </div>

                        {/* Subtle Background Icon */}
                        <div className="absolute -bottom-2 -left-2 text-white opacity-[0.01] pointer-events-none group-hover:opacity-[0.03] transition-all duration-700">
                            <Icon name={tool.icon} className="w-16 h-16" />
                        </div>
                    </button>
                ))}
            </div>
        </div>

        {/* Modal Footer */}
        <div className="px-8 py-5 border-t border-white/5 flex items-center justify-between bg-zinc-950/30 backdrop-blur-sm">
            <div className="flex items-center gap-3">
                <div className="px-3 py-1 bg-zinc-900/50 rounded-full border border-white/5">
                    <span className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">{project.name}</span>
                </div>
                <div className="w-1 h-1 bg-zinc-800 rounded-full"></div>
                <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-[0.2em]">Build v11.4.5</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-pulse shadow-[0_0_10px_rgba(234,88,12,0.4)]"></div>
                <span className="text-[8px] text-orange-700 font-black uppercase tracking-[0.2em] italic">Precision Core Online</span>
            </div>
        </div>
      </div>

      {/* Sketch Management Modal (Nested) */}
      {sketchModal.isOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-fade-in">
              <div className={`w-full ${sketchModal.mode === 'choice' || (sketchModal.mode === 'confirm' && !sketchModal.isGenerating) ? 'max-w-4xl' : 'max-w-2xl'} bg-[#121214] border border-zinc-800 rounded-[3rem] p-10 shadow-2xl relative transition-all duration-500`}>
                  
                  <button 
                      onClick={() => setSketchModal(prev => ({ ...prev, isOpen: false }))}
                      className="absolute top-10 right-10 text-zinc-500 hover:text-white transition-colors"
                  >
                      <Icon name="x-circle" className="w-8 h-8" />
                  </button>

                  {sketchModal.mode === 'confirm' && !sketchModal.sketchImage && !sketchModal.isGenerating && (
                      <div className="text-center">
                          <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-4 pt-4">Tối ưu hóa bản vẽ?</h3>
                          <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-10 max-w-xl mx-auto">
                              <div className="flex-1 space-y-3">
                                  <div className="aspect-[4/3] rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900 shadow-2xl w-full max-w-[220px] mx-auto">
                                      <img src="https://upload-r2-assets.huynhphvan.workers.dev/assets/original-image-placeholder.png" className="w-full h-full object-cover opacity-80" alt="Original Placeholder" />
                                  </div>
                                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ảnh thực tế / Sketchup</p>
                              </div>
                              <div className="text-orange-500"><Icon name="arrow-right-circle" className="w-8 h-8 rotate-90 md:rotate-0" /></div>
                              <div className="flex-1 space-y-3">
                                  <div className="aspect-[4/3] rounded-3xl overflow-hidden border border-orange-500/30 bg-white shadow-2xl shadow-orange-900/10 w-full max-w-[220px] mx-auto">
                                      <img src="https://upload-r2-assets.huynhphvan.workers.dev/assets/sketch-image-placeholder.png" className="w-full h-full object-cover" alt="Sketch Placeholder" />
                                  </div>
                                  <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Nét vẽ chi tiết (Sketch)</p>
                              </div>
                          </div>
                          <p className="text-zinc-400 font-medium mb-12 leading-relaxed text-sm max-w-lg mx-auto px-4">Để kết quả render đạt độ chính xác cao nhất, chúng tôi khuyên bạn nên chuyển đổi sang bản <span className="text-orange-500 font-black">Sketch (Nét vẽ)</span> để AI bám sát cấu trúc của bạn.</p>
                          <div className="flex gap-4 max-w-md mx-auto">
                              <button onClick={handleNoSketch} className="flex-1 py-5 rounded-2xl bg-zinc-800/50 border border-white/5 text-zinc-500 font-black uppercase tracking-widest text-xs hover:bg-zinc-800 transition-colors">Không, dùng ảnh gốc</button>
                              <button onClick={handleYesSketch} className="flex-1 py-5 rounded-2xl bg-orange-600 text-white font-black uppercase tracking-widest text-xs hover:bg-orange-500 shadow-xl shadow-orange-900/20 transition-all active:scale-95">Có, tạo bản Sketch</button>
                          </div>
                      </div>
                  )}

                  {sketchModal.mode === 'choice' && !sketchModal.isGenerating && (
                      <div className="text-center">
                           <div className="flex items-center justify-center gap-4 mb-10">
                                <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center shadow-lg"><Icon name="sparkles" className="w-7 h-7 text-white" /></div>
                                <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Chọn nguồn ảnh bắt đầu</h3>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                                <button onClick={handleNoSketch} className="group relative flex flex-col bg-zinc-900/50 border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-orange-500/50 transition-all text-left shadow-2xl">
                                    <div className="aspect-video w-full overflow-hidden"><img src={sourceImageToDataUrl(project.baseImage!)} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" alt="Original" /></div>
                                    <div className="p-8">
                                        <h4 className="text-white font-black uppercase text-base mb-1 group-hover:text-orange-500 transition-colors">Sử dụng Ảnh Gốc</h4>
                                        <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-widest leading-relaxed">Phù hợp nếu bạn muốn AI bám sát màu sắc thực tế.</p>
                                    </div>
                                    <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-xl text-[10px] font-black text-white uppercase tracking-widest border border-white/10">Mặc định</div>
                                </button>
                                <button onClick={handleContinueToStudio} className="group relative flex flex-col bg-zinc-900/50 border border-orange-500/20 rounded-[2.5rem] overflow-hidden hover:border-orange-500 transition-all text-left shadow-2xl">
                                    <div className="aspect-video w-full overflow-hidden bg-white"><img src={sketchModal.sketchImage ? sourceImageToDataUrl(sketchModal.sketchImage) : ''} className="w-full h-full object-contain" alt="Sketch" /></div>
                                    <div className="p-8">
                                        <h4 className="text-orange-500 font-black uppercase text-base mb-1">Sử dụng Bản Sketch</h4>
                                        <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-widest leading-relaxed">Khuyên dùng để AI tự do sáng tạo màu sắc & vật liệu.</p>
                                    </div>
                                    <div className="absolute top-6 right-6 bg-orange-600/90 backdrop-blur-md px-4 py-1.5 rounded-xl text-[10px] font-black text-white uppercase tracking-widest border border-orange-400/30">Khuyên dùng</div>
                                </button>
                           </div>
                      </div>
                  )}

                  {sketchModal.isGenerating && (
                      <div className="text-center py-16">
                          <div className="w-24 h-24 bg-zinc-800/50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl border border-white/5"><Icon name="sparkles" className="w-12 h-12 text-orange-500 animate-spin-slow" /></div>
                          <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-3">Đang phác thảo...</h3>
                          <p className="text-zinc-500 text-xs font-bold animate-pulse uppercase tracking-widest">AI đang phân tích & bóc tách đường nét kiến trúc</p>
                      </div>
                  )}

                  {sketchModal.mode === 'confirm' && sketchModal.sketchImage && !sketchModal.isGenerating && (
                      <div className="flex flex-col items-center">
                          <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-8">Bản Sketch đã sẵn sàng</h3>
                          <div className="w-full mb-10 shadow-2xl rounded-3xl overflow-hidden"><BeforeAfterSlider before={sourceImageToDataUrl(project.baseImage!)} after={sourceImageToDataUrl(sketchModal.sketchImage)} /></div>
                          <div className="flex gap-4 w-full">
                              <button onClick={() => setSketchModal(prev => ({ ...prev, sketchImage: null }))} className="px-8 py-5 rounded-2xl bg-zinc-800 border border-white/5 text-zinc-400 font-black uppercase tracking-widest text-xs hover:bg-zinc-700 transition-colors" title="Thử lại"><Icon name="arrow-uturn-left" className="w-5 h-5" /></button>
                              <button onClick={handleContinueToStudio} className="flex-1 py-5 rounded-2xl bg-orange-600 text-white font-black uppercase tracking-widest text-xs hover:bg-orange-500 shadow-xl shadow-orange-900/20 transition-all active:scale-95 flex items-center justify-center gap-4"><span>Tiếp tục vào Studio</span><Icon name="arrow-right-circle" className="w-6 h-6" /></button>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};
