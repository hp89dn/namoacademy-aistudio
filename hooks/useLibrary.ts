
import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { LibraryItem } from '../types';
import { 
    addLibraryItemToDB, 
    getAllLibraryItemsFromDB, 
    deleteLibraryItemFromDB
} from '../services/db';

export const useLibrary = () => {
    const [library, setLibrary] = useState<LibraryItem[]>([]);
    const [justSavedId, setJustSavedId] = useState<string | null>(null);

    // Load library from IndexedDB on initial render
    useEffect(() => {
        const loadLibrary = async () => {
            try {
                const savedLibrary = await getAllLibraryItemsFromDB();
                setLibrary(savedLibrary);
            } catch (error) {
                console.error("Failed to load library from IndexedDB:", error);
            }
        };

        loadLibrary();
    }, []);

    const addImageToLibrary = useCallback(async (imageDataUrl: string) => {
        // Prevent duplicates
        if (library.some(item => item.imageData === imageDataUrl)) {
            console.log("Image already in library.");
            return;
        }

        const newLibraryItem: LibraryItem = { id: uuidv4(), imageData: imageDataUrl };
        
        try {
            await addLibraryItemToDB(newLibraryItem);
            setLibrary(prev => [newLibraryItem, ...prev]);
            setJustSavedId(newLibraryItem.id);
            setTimeout(() => setJustSavedId(null), 2000); // Reset after 2 seconds
        } catch (error) {
            console.error("Failed to save library item to IndexedDB:", error);
        }
    }, [library]);

    const removeImageFromLibrary = useCallback(async (id: string) => {
        try {
            await deleteLibraryItemFromDB(id);
            setLibrary(prev => prev.filter(item => item.id !== id));
        } catch (error) {
            console.error("Failed to delete library item from IndexedDB:", error);
        }
    }, []);
    
    return { library, addImageToLibrary, removeImageFromLibrary, justSavedId };
};
