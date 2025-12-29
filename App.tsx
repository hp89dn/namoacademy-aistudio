
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
// Correctly import modular functions and type to fix missing export errors
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from './services/firebase';
import { Icon } from './components/icons';
import { 
  fetchUserProjects, 
  deleteProjectFromCloud, 
  createProjectInCloud,
} from './services/firebaseService';
import type { Project, SourceImage, ActiveTab } from './types';

// Components
import { WelcomeScreen } from './components/WelcomeScreen';
import { StudioView } from './components/StudioView';
import { AuthScreen } from './components/AuthScreen';

const LoadingFallback = () => (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#09090b]">
        <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-orange-900/10 border border-zinc-800">
            <Icon name="sparkles" className="w-10 h-10 text-orange-500 animate-spin-slow" />
        </div>
        <h2 className="text-lg font-black text-white tracking-tighter uppercase">NamO Academy AI</h2>
        <p className="text-zinc-500 text-xs mt-2 font-bold animate-pulse">Khởi tạo môi trường...</p>
    </div>
);

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [view, setView] = useState<'welcome' | 'studio'>('welcome');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [initialTab, setInitialTab] = useState<ActiveTab>('create');
  const [initialUtility, setInitialUtility] = useState<any>(null);
  const [initialSourceImage, setInitialSourceImage] = useState<SourceImage | null>(null);

  // Auth Listener - correctly using modular onAuthStateChanged function
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setInitializing(false);
    });
    return () => unsubscribe();
  }, []);

  const loadProjects = useCallback(async () => {
    if (!currentUser) return;
    try {
        const list = await fetchUserProjects(currentUser.uid);
        setProjects(list);
    } catch (error) {
        console.error("Failed to load projects:", error);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
        loadProjects();
    } else {
        setProjects([]);
    }
  }, [currentUser, loadProjects]);

  const handleCreateProject = useCallback(async (name: string, image: SourceImage) => {
    if (!currentUser) return;
    try {
        await createProjectInCloud(currentUser.uid, name, image);
        await loadProjects();
    } catch (err) {
        console.error("Create project error:", err);
    }
  }, [currentUser, loadProjects]);

  const handleDeleteProject = useCallback(async (id: string) => {
      try {
          await deleteProjectFromCloud(id);
          await loadProjects();
      } catch (err) {
          console.error("Delete project error:", err);
      }
  }, [loadProjects]);

  const handleSelectProject = useCallback((project: Project) => {
    setActiveProjectId(project.id);
    setView('studio');
    setInitialSourceImage(null);
  }, []);

  const handleBackToWelcome = useCallback(() => {
    setView('welcome');
    setActiveProjectId(null);
  }, []);

  const handleLogout = async () => {
      try {
          // Correctly using modular signOut function to fix the error
          await signOut(auth);
          setView('welcome');
          setActiveProjectId(null);
      } catch (err) {
          console.error("Sign out error:", err);
      }
  };

  const sortedProjects = useMemo(() => {
      return [...projects].sort((a, b) => b.lastModified - a.lastModified);
  }, [projects]);

  if (initializing) return <LoadingFallback />;
  
  if (!currentUser) return <AuthScreen />;
  
  if (view === 'welcome') {
    return (
      <WelcomeScreen 
        onStart={() => {}} 
        projects={sortedProjects} 
        onSelectProject={handleSelectProject}
        onDeleteProject={handleDeleteProject}
        onCreateProject={handleCreateProject}
        user={currentUser}
        onLogout={handleLogout} 
      />
    );
  }

  if (view === 'studio' && activeProjectId) {
    return (
        <StudioView 
            user={currentUser} 
            projectId={activeProjectId}
            initialTab={initialTab}
            initialUtility={initialUtility}
            initialSourceImage={initialSourceImage}
            onLogout={handleLogout} 
            onBack={handleBackToWelcome}
        />
    );
  }

  return <WelcomeScreen onStart={() => {}} projects={[]} onSelectProject={() => {}} onDeleteProject={() => {}} onCreateProject={() => {}} user={currentUser} onLogout={handleLogout} />;
}
