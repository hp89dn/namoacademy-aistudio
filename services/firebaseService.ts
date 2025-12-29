
// @ts-ignore
import { collection, doc, deleteDoc, getDocs, orderBy, query, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "./firebase";
import { uploadToWorker } from "./storageService";
import { optimizeImageForStorage, createThumbnail } from "./imageService";
import type { Project, Version, SourceImage } from "../types";
import { v4 as uuidv4 } from 'uuid';

export const createProjectInCloud = async (userId: string, name: string, baseImage: SourceImage): Promise<Project> => {
  const projectRef = doc(collection(db, "projects"));
  const timestamp = Date.now();
  const fileId = uuidv4();
  const imagePath = `users/${userId}/projects/${projectRef.id}/base_${fileId}.png`;
  
  if (!baseImage.base64 && !baseImage.url) throw new Error("Base image data is missing.");
  
  try {
    // 1. Optimize image before upload (clamped to 1600x1200)
    const optimizedImage = await optimizeImageForStorage(baseImage);
    
    // 2. Ensure we have base64 for upload
    let uploadBase64 = optimizedImage.base64;
    if (!uploadBase64 && optimizedImage.url) {
        // This case handles rare re-creations from existing URLs
        const resp = await fetch(optimizedImage.url);
        const blob = await resp.blob();
        uploadBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(blob);
        });
    }

    if (!uploadBase64) throw new Error("Failed to extract image data for optimization.");

    // 3. Upload base image as binary PNG/JPG for storage efficiency
    const imageUrl = await uploadImageToCloud(imagePath, uploadBase64, baseImage.mimeType);

    const projectData: Project = {
      id: projectRef.id,
      userId,
      name,
      baseImage: { 
          url: imageUrl, 
          mimeType: baseImage.mimeType 
      },
      createdAt: timestamp,
      lastModified: timestamp
    };

    await setDoc(projectRef, projectData);
    return projectData;
  } catch (error: any) {
    console.error("Error in createProjectInCloud:", error);
    throw new Error(error.message || "Failed to create project in cloud.");
  }
};

export const fetchUserProjects = async (userId: string): Promise<Project[]> => {
  try {
    const q = query(
      collection(db, "projects"), 
      where("userId", "==", userId),
      orderBy("lastModified", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as Project);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return [];
  }
};

export const deleteProjectFromCloud = async (projectId: string): Promise<void> => {
  // 1. Delete the main project document
  const projectDocRef = doc(db, "projects", projectId);
  await deleteDoc(projectDocRef);
  
  // 2. Query and delete all associated versions
  const versionsQuery = query(collection(db, "versions"), where("projectId", "==", projectId));
  const versionsSnapshot = await getDocs(versionsQuery);
  
  const deletePromises = versionsSnapshot.docs.map((vDoc) => deleteDoc(vDoc.ref));
  await Promise.all(deletePromises);
};

export const saveVersionToCloud = async (version: Omit<Version, 'id'>): Promise<Version> => {
  const versionRef = doc(collection(db, "versions"));
  
  let imageUrl = version.image;
  let thumbnailUrl = '';

  // Handle newly generated images (Data URLs)
  if (version.image.startsWith('data:')) {
      // 1. Create and upload thumbnail
      const thumbDataUrl = await createThumbnail(version.image);
      if (thumbDataUrl) {
          const [thumbHeader, thumbBase64] = thumbDataUrl.split(',');
          const thumbMimeType = thumbHeader.match(/:(.*?);/)?.[1] || 'image/jpeg';
          const thumbPath = `projects/${version.projectId}/versions/thumbnail_${uuidv4()}.jpg`;
          try {
              thumbnailUrl = await uploadImageToCloud(thumbPath, thumbBase64, thumbMimeType);
          } catch (err) {
              console.warn("Thumbnail upload failed:", err);
          }
      }

      // 2. Upload full image
      const [header, base64] = version.image.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
      const imagePath = `projects/${version.projectId}/versions/${versionRef.id}.png`;
      
      try {
          imageUrl = await uploadImageToCloud(imagePath, base64, mimeType);
      } catch (err) {
          console.warn("Version image upload failed, falling back to data URL:", err);
          imageUrl = version.image;
      }
  } else if (version.image.startsWith('http')) {
      // If it's already a URL, but we don't have a thumbnail yet, still try to create one
      // This case might happen if a tool provides a URL directly.
      const thumbDataUrl = await createThumbnail(version.image);
      if (thumbDataUrl) {
          const [thumbHeader, thumbBase64] = thumbDataUrl.split(',');
          const thumbMimeType = thumbHeader.match(/:(.*?);/)?.[1] || 'image/jpeg';
          const thumbPath = `projects/${version.projectId}/versions/thumbnail_${uuidv4()}.jpg`;
          try {
              thumbnailUrl = await uploadImageToCloud(thumbPath, thumbBase64, thumbMimeType);
          } catch (err) {
              console.warn("Late thumbnail upload failed:", err);
          }
      }
  }

  const versionData: Version = {
    ...version,
    id: versionRef.id,
    image: imageUrl,
    thumbnailUrl,
    createdAt: Date.now()
  };

  await setDoc(versionRef, versionData);
  
  // Also update project's lastModified timestamp
  try {
      const projectRef = doc(db, "projects", version.projectId);
      await updateDoc(projectRef, { lastModified: Date.now() });
  } catch (e) {
      console.warn("Failed to update project lastModified:", e);
  }

  return versionData;
};

export const fetchProjectVersions = async (projectId: string): Promise<Version[]> => {
  try {
    const q = query(
      collection(db, "versions"), 
      where("projectId", "==", projectId),
      orderBy("createdAt", "asc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as Version);
  } catch (error) {
    console.error("Error fetching versions:", error);
    return [];
  }
};

/**
 * Single-upload: Binary image Blob (PNG/JPG)
 * Efficiency: No longer uploads redundant Base64 text files.
 * Canvas compatibility is handled by on-the-fly conversion when reopening.
 */
export const uploadImageToCloud = async (
  path: string, 
  base64: string, 
  mimeType: string
): Promise<string> => {
  const { base64ToBlob } = await import("./imageService");
  const imageBlob = base64ToBlob(base64, mimeType);
  const imageUrl = await uploadToWorker(path, imageBlob);
  return imageUrl;
};
