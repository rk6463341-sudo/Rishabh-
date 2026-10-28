import { Project, BrandKit, SocialPost, AppSettings } from '../types';
import { DEFAULT_CAPTION_STYLE } from '../constants/templates';

const DB_NAME = 'framenova_db';
const DB_VERSION = 1;

export const DEFAULT_SETTINGS: AppSettings = {
  defaultAspect: '9:16',
  defaultClipDuration: 30,
  defaultContentType: 'general',
  exportResolution: '1080p',
  exportFps: 30,
  exportFormat: 'webm',
  burnSubtitlesByDefault: true,
  autoTranscribeOnImport: true,
};

export const DEFAULT_BRAND_KIT: BrandKit = {
  id: 'default-brand-kit',
  name: 'Default Brand Kit',
  primaryColor: '#8B5CF6',
  accentColor: '#06B6D4',
  backgroundColor: '#0B0D13',
  fontTitle: 'Plus Jakarta Sans',
  fontBody: 'Plus Jakarta Sans',
  watermarkText: 'FrameNova AI',
  watermarkOpacity: 0.75,
  watermarkPosition: 'top-right',
  captionStyle: DEFAULT_CAPTION_STYLE,
};

class StorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('video_blobs')) {
          db.createObjectStore('video_blobs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('brand_kits')) {
          db.createObjectStore('brand_kits', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('social_posts')) {
          db.createObjectStore('social_posts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  // --- PROJECTS ---
  async getProjects(): Promise<Project[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('projects', 'readonly');
        const store = tx.objectStore('projects');
        const request = store.getAll();

        request.onsuccess = () => {
          const list = request.result as Project[];
          // Sort descending by updatedAt
          list.sort((a, b) => b.updatedAt - a.updatedAt);
          resolve(list);
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      return [];
    }
  }

  async getProject(id: string): Promise<Project | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('projects', 'readonly');
        const store = tx.objectStore('projects');
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return null;
    }
  }

  async saveProject(project: Project): Promise<void> {
    const db = await this.getDB();
    project.updatedAt = Date.now();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('projects', 'readwrite');
      const store = tx.objectStore('projects');
      const request = store.put(project);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteProject(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['projects', 'video_blobs'], 'readwrite');
      const pStore = tx.objectStore('projects');
      const bStore = tx.objectStore('video_blobs');

      pStore.delete(id);
      bStore.delete(id);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- VIDEO BLOB CACHE ---
  async saveVideoBlob(id: string, blob: Blob): Promise<void> {
    // Only cache if under 150MB to avoid hitting IndexedDB hard quotas unexpectedly
    if (blob.size > 150 * 1024 * 1024) return;
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('video_blobs', 'readwrite');
        const store = tx.objectStore('video_blobs');
        const request = store.put({ id, blob, updatedAt: Date.now() });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn('Could not cache video blob in IndexedDB:', e);
    }
  }

  async getVideoBlob(id: string): Promise<Blob | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('video_blobs', 'readonly');
        const store = tx.objectStore('video_blobs');
        const request = store.get(id);
        request.onsuccess = () => {
          if (request.result && request.result.blob) {
            resolve(request.result.blob);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      return null;
    }
  }

  // --- BRAND KITS ---
  async getBrandKits(): Promise<BrandKit[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('brand_kits', 'readonly');
        const store = tx.objectStore('brand_kits');
        const request = store.getAll();

        request.onsuccess = () => {
          const list = request.result as BrandKit[];
          if (!list || list.length === 0) {
            // Seed default
            this.saveBrandKit(DEFAULT_BRAND_KIT);
            resolve([DEFAULT_BRAND_KIT]);
          } else {
            resolve(list);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      return [DEFAULT_BRAND_KIT];
    }
  }

  async saveBrandKit(kit: BrandKit): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('brand_kits', 'readwrite');
      const store = tx.objectStore('brand_kits');
      const request = store.put(kit);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- SOCIAL POSTS ---
  async getSocialPosts(): Promise<SocialPost[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('social_posts', 'readonly');
        const store = tx.objectStore('social_posts');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return [];
    }
  }

  async saveSocialPost(post: SocialPost): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('social_posts', 'readwrite');
      const store = tx.objectStore('social_posts');
      const request = store.put(post);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteSocialPost(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('social_posts', 'readwrite');
      const store = tx.objectStore('social_posts');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- SETTINGS ---
  async getSettings(): Promise<AppSettings> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('settings', 'readonly');
        const store = tx.objectStore('settings');
        const request = store.get('app_settings');
        request.onsuccess = () => {
          if (request.result && request.result.value) {
            resolve({ ...DEFAULT_SETTINGS, ...request.result.value });
          } else {
            resolve(DEFAULT_SETTINGS);
          }
        };
        request.onerror = () => resolve(DEFAULT_SETTINGS);
      });
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      const request = store.put({ key: 'app_settings', value: settings });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- STORAGE STATS ---
  async getStorageEstimate(): Promise<{ usedBytes: number; quotaBytes: number; percentage: number }> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const usedBytes = estimate.usage || 0;
        const quotaBytes = estimate.quota || 1024 * 1024 * 1024;
        const percentage = Math.min(100, (usedBytes / quotaBytes) * 100);
        return { usedBytes, quotaBytes, percentage };
      } catch (e) {
        console.warn('Storage estimate failed:', e);
      }
    }
    return { usedBytes: 0, quotaBytes: 1024 * 1024 * 1024, percentage: 0 };
  }

  async clearAllData(): Promise<void> {
    const db = await this.getDB();
    const storeNames = ['projects', 'video_blobs', 'brand_kits', 'social_posts', 'settings'];
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeNames, 'readwrite');
      for (const name of storeNames) {
        tx.objectStore(name).clear();
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const storage = new StorageService();
