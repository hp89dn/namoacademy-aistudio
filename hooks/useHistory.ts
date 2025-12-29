
import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { HistoryItem } from '../types';
import { 
    addHistoryItemToDB, 
    getAllHistoryItemsFromDB, 
    clearHistoryFromDB,
    trimHistoryInDB
} from '../services/db';

const MAX_HISTORY_ITEMS = 50;

export const useHistory = () => {
    const [history, setHistory] = useState<HistoryItem[]>([]);

    // Load history from IndexedDB on initial render
    useEffect(() => {
        const loadHistory = async () => {
            try {
                const savedHistory = await getAllHistoryItemsFromDB();
                setHistory(savedHistory);
            } catch (error) {
                console.error("Failed to load history from IndexedDB:", error);
            }
        };

        loadHistory();
    }, []);

    const addHistoryItem = useCallback(async (item: Omit<HistoryItem, 'id'>) => {
        const newHistoryItem: HistoryItem = { ...item, id: uuidv4() };
        
        try {
            await addHistoryItemToDB(newHistoryItem);
            // Trim the DB to keep it within size limits
            await trimHistoryInDB(MAX_HISTORY_ITEMS);
            // Re-fetch to update state, ensuring consistency
            const updatedHistory = await getAllHistoryItemsFromDB();
            setHistory(updatedHistory);
        } catch (error) {
            console.error("Failed to save history item to IndexedDB:", error);
            // Fallback to update state anyway for UX
            setHistory(prev => [newHistoryItem, ...prev].slice(0, MAX_HISTORY_ITEMS));
        }
    }, []);

    const clearHistory = useCallback(async () => {
        try {
            await clearHistoryFromDB();
            setHistory([]);
        } catch (error) {
            console.error("Failed to clear history from IndexedDB:", error);
        }
    }, []);
    
    return { history, addHistoryItem, clearHistory };
};
