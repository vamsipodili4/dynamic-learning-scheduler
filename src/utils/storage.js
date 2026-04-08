import localforage from 'localforage';

// Configure localforage to enforce IndexedDB as primary driver
localforage.config({
  driver: localforage.INDEXEDDB,
  name: 'DynamicLearningScheduler',
  version: 1.0,
  storeName: 'study_materials', 
  description: 'Stores heavy PDF and text files locally without a cloud server.'
});

export const saveStudyMaterial = async (file) => {
  const fileId = Date.now().toString();
  const storageId = `file_${fileId}`;
  
  // Save actual blob/file
  await localforage.setItem(storageId, file);
  
  // Update lightweight index map for quick dropdown listing
  const fileIndex = await localforage.getItem('file_index') || [];
  fileIndex.unshift({ id: storageId, name: file.name, size: file.size, timestamp: Date.now() });
  await localforage.setItem('file_index', fileIndex);
  
  return { id: storageId, name: file.name };
};

export const getStudyMaterialsIndex = async () => {
  return await localforage.getItem('file_index') || [];
};

export const loadStudyMaterialUrl = async (id) => {
  const fileBlob = await localforage.getItem(id);
  if (!fileBlob) return null;
  // Create an object URL from the stored Blob so the iframe can read it
  return URL.createObjectURL(fileBlob);
};

export const getStudyMaterialRaw = async (id) => {
  return await localforage.getItem(id);
};

export const deleteStudyMaterial = async (id) => {
  await localforage.removeItem(id);
  const fileIndex = await localforage.getItem('file_index') || [];
  const updatedIndex = fileIndex.filter(f => f.id !== id);
  await localforage.setItem('file_index', updatedIndex);
  return updatedIndex;
};
