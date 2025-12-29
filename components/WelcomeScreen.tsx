
import React, { useState } from 'react';
// Correctly import User as a type to fix compiler missing member error
import { type User } from 'firebase/auth';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import type { Project, SourceImage } from '../types';
import { Icon } from './icons';
import { sourceImageToDataUrl } from '../utils';
import { ImageDropzone } from './ImageDropzone';

interface WelcomeScreenProps {
    onStart: () => void;
    projects: Project[];
    onSelectProject: (project: Project) => void;
    onDeleteProject: (id: string) => void;
    onCreateProject: (name: string, image: SourceImage) => void;
    user: User;
    onLogout: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
    projects, onSelectProject, onDeleteProject, onCreateProject, user, onLogout 
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { theme } = useTheme();
  
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectImage, setNewProjectImage] = useState<SourceImage | null>(null);
  
  // State for Delete Confirmation Modal
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const handleCreate = () => {
      if (!newProjectName.trim() || !newProjectImage) {
          return;
      }
      onCreateProject(newProjectName, newProjectImage);
      setNewProjectName('');
      setNewProjectImage(null);
      setShowNewProjectModal(false);
  };

  const confirmDelete = () => {
      if (projectToDelete) {
          onDeleteProject(projectToDelete.id);
          setProjectToDelete(null);
      }
  };

  return (
    <div className={`min-h-screen w-full ${theme.appBg} ${theme.textMain} flex flex-col relative overflow-hidden transition-colors duration-300 font-sans`}>
        {/* Header Bar */}
        <div className={`w-full mx-auto px-8 py-5 flex justify-between items-center z-20 relative ${theme.panelBg} border-b ${theme.border}`}>
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-900/20">
                    <Icon name="sparkles" className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-lg font-bold tracking-tight text-zinc-100 uppercase">
                    NamO Academy <span className="text-orange-600 font-black italic">AI</span>
                </h1>
            </div>

            <div className="flex items-center gap-6">
                <div className={`flex items-center gap-3 px-4 py-1.5 ${theme.inputBg} rounded-xl border ${theme.border}`}>
                    <div className="w-7 h-7 rounded-full bg-zinc-100 text-zinc-900 flex items-center justify-center text-[10px] font-bold">
                        {user.email?.[0].toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-1">User</span>
                        <span className="text-xs font-bold text-zinc-300 leading-none">{user.email?.split('@')[0]}</span>
                    </div>
                    <button 
                        onClick={onLogout}
                        className="ml-2 p-1 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Đăng xuất"
                    >
                        <Icon name="arrow-uturn-left" className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className={`flex space-x-1 ${theme.inputBg} p-1 rounded-lg border ${theme.border}`}>
                    <button
                        onClick={() => setLanguage('vi')}
                        className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${language === 'vi' ? 'bg-orange-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-200'}`}
                    >
                        VN
                    </button>
                    <button
                        onClick={() => setLanguage('en')}
                        className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${language === 'en' ? 'bg-orange-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-200'}`}
                    >
                        EN
                    </button>
                </div>
            </div>
        </div>

        {/* Dashboard Content */}
        <main className="flex-grow max-w-[1600px] mx-auto w-full px-8 py-10 z-10 overflow-y-auto">
            <div className="flex items-center justify-between mb-10">
                <div>
                    <h2 className="text-3xl font-black text-white mb-1">Xin chào 👋</h2>
                    <p className="text-zinc-500 font-medium text-sm">Bạn có {projects.length} dự án đang được lưu trữ trên đám mây.</p>
                </div>
                <button 
                    onClick={() => setShowNewProjectModal(true)}
                    className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-xl shadow-orange-900/10 active:scale-95"
                >
                    <Icon name="plus-circle" className="w-5 h-5" />
                    <span className="text-sm">Tạo dự án mới</span>
                </button>
            </div>

            {projects.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {projects.map((p) => (
                        <div 
                            key={p.id}
                            className={`group relative ${theme.panelBg} border ${theme.border} rounded-2xl overflow-hidden hover:border-zinc-600 transition-all duration-300 cursor-pointer`}
                            onClick={() => onSelectProject(p)}
                        >
                            <div className="aspect-[4/3] bg-zinc-950 relative overflow-hidden border-b border-zinc-800">
                                {p.baseImage ? (
                                    <img 
                                        src={sourceImageToDataUrl(p.baseImage)} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
                                        alt={p.name}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Icon name="clipboard" className="w-10 h-10 text-zinc-800" />
                                    </div>
                                )}
                            </div>
                            
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-1.5">
                                    <h3 className="text-sm font-bold text-zinc-100 group-hover:text-orange-500 transition-colors truncate pr-2">{p.name}</h3>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setProjectToDelete(p); }}
                                        className="p-1 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 transition-all rounded-lg opacity-0 group-hover:opacity-100"
                                        title={t('delete')}
                                    >
                                        <Icon name="trash" className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <p className="text-[8px] text-zinc-500 font-bold flex items-center gap-1 uppercase tracking-widest">
                                    <Icon name="clock" className="w-2.5 h-2.5" />
                                    {new Date(p.lastModified).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={`h-[50vh] flex flex-col items-center justify-center text-center border border-dashed ${theme.border} rounded-3xl ${theme.panelBg}`}>
                    <div className={`w-24 h-24 bg-zinc-950 shadow-inner rounded-3xl flex items-center justify-center mb-8 border border-zinc-800`}>
                        <Icon name="clipboard" className="w-10 h-10 text-zinc-800" />
                    </div>
                    <h3 className="text-2xl font-black text-zinc-700 mb-2 tracking-tight">Studio Đang Trống</h3>
                    <p className="text-zinc-600 max-w-sm font-medium text-base">Bắt đầu bằng cách tạo dự án đầu tiên của bạn để khám phá sức mạnh AI.</p>
                </div>
            )}
        </main>

        {/* New Project Modal */}
        {showNewProjectModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
                <div className={`w-full max-w-xl ${theme.panelBg} rounded-3xl p-10 border ${theme.border} shadow-2xl`}>
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-2xl font-black text-white tracking-tighter uppercase">Thiết lập dự án</h3>
                        <button onClick={() => setShowNewProjectModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                            <Icon name="x-circle" className="w-8 h-8" />
                        </button>
                    </div>
                    
                    <div className="space-y-8">
                        <div>
                            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 ml-1">Tên công trình</label>
                            <input 
                                autoFocus
                                placeholder="Vd: Villa Nghỉ Dưỡng Đà Lạt..." 
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                className={`w-full ${theme.inputBg} border ${theme.border} rounded-xl p-4 text-white font-bold text-base placeholder:text-zinc-700 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition-all`}
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 ml-1">Ảnh gốc dự án (Bắt buộc)</label>
                            {newProjectImage ? (
                                <div className={`relative group aspect-video bg-zinc-950 rounded-xl overflow-hidden border ${theme.border}`}>
                                    <img src={sourceImageToDataUrl(newProjectImage)} className="w-full h-full object-contain" alt="Project seed" />
                                    <button 
                                        onClick={() => setNewProjectImage(null)}
                                        className="absolute top-4 right-4 bg-red-600 text-white p-2 rounded-lg shadow-lg hover:bg-red-700 transition-colors"
                                    >
                                        <Icon name="trash" className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <ImageDropzone 
                                    onImageUpload={setNewProjectImage} 
                                    className={`w-full aspect-video border-2 border-dashed ${theme.border} rounded-xl flex flex-col items-center justify-center gap-4 text-zinc-500 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all cursor-pointer group`}
                                >
                                    <div className={`w-14 h-14 bg-zinc-900 group-hover:bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-800`}>
                                        <Icon name="arrow-up-tray" className="w-6 h-6 text-zinc-600 group-hover:text-orange-500" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-zinc-500 uppercase tracking-widest text-[10px]">Tải ảnh lên hoặc kéo thả</p>
                                        <p className="text-[9px] mt-1 opacity-60">PNG, JPG hoặc WEBP</p>
                                    </div>
                                </ImageDropzone>
                            )}
                        </div>

                        <div className="flex gap-4 pt-2">
                            <button 
                                onClick={() => setShowNewProjectModal(false)} 
                                className={`flex-1 py-4 rounded-xl ${theme.inputBg} border ${theme.border} text-zinc-500 font-black uppercase tracking-widest text-xs hover:bg-zinc-700 transition-colors`}
                            >
                                Hủy bỏ
                            </button>
                            <button 
                                onClick={handleCreate} 
                                disabled={!newProjectName || !newProjectImage}
                                className="flex-1 py-4 rounded-xl bg-orange-600 text-white font-black uppercase tracking-widest text-xs hover:bg-orange-500 shadow-xl shadow-orange-900/20 transition-all active:scale-95 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:shadow-none"
                            >
                                Tạo Dự Án
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Delete Confirmation Modal */}
        {projectToDelete && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm animate-fade-in">
                <div className={`w-full max-w-md ${theme.panelBg} border ${theme.border} rounded-2xl p-8 shadow-2xl`}>
                    <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto border border-red-500/20">
                        <Icon name="trash" className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-black text-white text-center mb-2 uppercase tracking-tight">Xóa dự án?</h3>
                    <p className="text-zinc-500 text-center font-medium mb-8 leading-relaxed text-sm px-4">
                        Bạn có chắc chắn muốn xóa dự án <span className="text-zinc-200 font-bold">"{projectToDelete.name}"</span>? 
                        Toàn bộ dữ liệu phiên bản sẽ bị xóa vĩnh viễn khỏi đám mây.
                    </p>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setProjectToDelete(null)}
                            className={`flex-1 py-3 rounded-xl ${theme.inputBg} border ${theme.border} text-zinc-500 font-black uppercase tracking-widest text-[10px] hover:bg-zinc-800 transition-colors`}
                        >
                            Hủy
                        </button>
                        <button 
                            onClick={confirmDelete}
                            className="flex-1 py-3 rounded-xl bg-red-600 text-white font-black uppercase tracking-widest text-[10px] hover:bg-red-700 shadow-xl shadow-red-900/10 transition-all active:scale-95"
                        >
                            Xác nhận xóa
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
