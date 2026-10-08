/**
 * TBF School Hub - Unified Client Data Store & Backend Database Sync Engine
 * Directly connected to the official TBF School Hub Backend API (/api/v1/*).
 * Provides instantaneous reactivity, optimistic local caching, cross-tab sync,
 * and background synchronization with backend database endpoints.
 */

import { apiFetch } from "./services/api";

export interface DbRef {
  type: "doc" | "collection";
  collection: string;
  id?: string;
  path: string;
}

export const db = {
  name: "tbf_schoolhub_database",
  version: "2.0.0",
};

// Global memory subscribers for instant intra-tab and inter-component reactivity
const subscribers: Record<string, Set<() => void>> = {};

function notifySubscribers(path: string, collectionName: string) {
  if (subscribers[path]) {
    subscribers[path].forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.warn("Subscriber notify error:", e);
      }
    });
  }
  if (collectionName && subscribers[collectionName]) {
    subscribers[collectionName].forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.warn("Collection subscriber notify error:", e);
      }
    });
  }
}

// Storage key helper
function getStorageKey(path: string): string {
  return `tbf_db_${path}`;
}

export function doc(_db: any, collectionName: string, id: string): DbRef {
  return {
    type: "doc",
    collection: collectionName,
    id: id,
    path: `${collectionName}/${id}`,
  };
}

export function collection(_db: any, collectionName: string): DbRef {
  return {
    type: "collection",
    collection: collectionName,
    path: collectionName,
  };
}

export async function getDoc(docRef: DbRef): Promise<{
  exists: () => boolean;
  data: () => any;
  id: string;
}> {
  const key = getStorageKey(docRef.path);
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      return {
        exists: () => true,
        data: () => parsed,
        id: docRef.id || "",
      };
    }
  } catch (e) {}

  return {
    exists: () => false,
    data: () => null,
    id: docRef.id || "",
  };
}

export async function getDocs(ref: DbRef): Promise<{
  forEach: (fn: (doc: any) => void) => void;
  docs: any[];
  size: number;
  empty: boolean;
}> {
  const collectionName = ref.collection;

  // Try fetching fresh data from backend first
  try {
    const backendData = await fetchCollectionFromBackend(collectionName);
    if (Array.isArray(backendData)) {
      const docs = backendData.map(item => ({
        id: String(item.id || item.regNo || item.email || item.student_id || item.name || ""),
        data: () => item,
        exists: () => true
      }));
      return {
        forEach: (fn) => docs.forEach(fn),
        docs,
        size: docs.length,
        empty: docs.length === 0
      };
    }
  } catch {}

  // Fallback to local storage
  const prefix = `tbf_db_${collectionName}/`;
  const list: any[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (storageKey && storageKey.startsWith(prefix)) {
        const docId = storageKey.substring(prefix.length);
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const data = JSON.parse(raw);
          list.push({
            id: docId,
            data: () => data,
            exists: () => true
          });
        }
      }
    }
  } catch {}

  return {
    forEach: (fn) => list.forEach(fn),
    docs: list,
    size: list.length,
    empty: list.length === 0
  };
}

export async function setDoc(
  docRef: DbRef,
  data: any,
  options?: { merge?: boolean }
): Promise<void> {
  const key = getStorageKey(docRef.path);
  let finalData = data;

  if (options?.merge) {
    const existing = await getDoc(docRef);
    if (existing.exists()) {
      finalData = { ...existing.data(), ...data };
    }
  }

  try {
    localStorage.setItem(key, JSON.stringify(finalData));
  } catch (e) {
    console.warn("Storage write error on setDoc:", e);
  }

  notifySubscribers(docRef.path, docRef.collection);

  // Synchronize mutation with backend endpoint database
  syncSetToBackend(docRef, finalData).catch(err => {
    console.warn("[Database Sync] Failed to sync setDoc to backend:", err);
  });
}

export async function deleteDoc(docRef: DbRef): Promise<void> {
  const key = getStorageKey(docRef.path);
  try {
    localStorage.removeItem(key);
  } catch (e) {}

  notifySubscribers(docRef.path, docRef.collection);

  // Synchronize delete with backend endpoint database
  syncDeleteToBackend(docRef).catch(err => {
    console.warn("[Database Sync] Failed to sync deleteDoc to backend:", err);
  });
}

/**
 * Sync mutations to backend endpoints database
 */
async function syncSetToBackend(docRef: DbRef, data: any) {
  const col = (docRef.collection || "").toLowerCase();
  const id = docRef.id || "";
  try {
    if (col === "students") {
      await apiFetch("/students", {
        method: "POST",
        body: JSON.stringify(data)
      });
    } else if (col === "teachers") {
      await apiFetch("/teachers", {
        method: "POST",
        body: JSON.stringify(data)
      });
    } else if (col === "classes") {
      await apiFetch("/classes", {
        method: "POST",
        body: JSON.stringify({
          class_name: data.name || data.class_name,
          ...data
        })
      });
    } else if (col === "materials") {
      await apiFetch("/materials", {
        method: "POST",
        body: JSON.stringify(data)
      });
    } else if (col === "timetable") {
      await apiFetch("/timetable", {
        method: "POST",
        body: JSON.stringify(data)
      });
    } else if (col === "class_chats") {
      if (data && Array.isArray(data.messages) && data.messages.length > 0) {
        const lastMsg = data.messages[data.messages.length - 1];
        await apiFetch(`/classes/${encodeURIComponent(id)}/chat`, {
          method: "POST",
          body: JSON.stringify(lastMsg)
        });
      }
    } else if (col === "forum") {
      if (data && Array.isArray(data.posts) && data.posts.length > 0) {
        const lastPost = data.posts[0];
        await apiFetch("/discussions", {
          method: "POST",
          body: JSON.stringify({
            content: lastPost.content,
            title: lastPost.content ? lastPost.content.substring(0, 50) : "Discussion",
            class_name: id,
            author_name: lastPost.author,
            role: lastPost.role
          })
        });
      }
    } else if (col === "attendance") {
      await apiFetch("/attendance", {
        method: "POST",
        body: JSON.stringify(data)
      });
    } else if (col === "notifications") {
      await apiFetch("/notifications", {
        method: "POST",
        body: JSON.stringify(data)
      });
    }
  } catch (err) {
    // Non-blocking
  }
}

/**
 * Sync deletions to backend endpoints database
 */
async function syncDeleteToBackend(docRef: DbRef) {
  const col = (docRef.collection || "").toLowerCase();
  const id = docRef.id || "";
  if (!id) return;

  try {
    if (col === "students") {
      await apiFetch(`/students/${encodeURIComponent(id)}?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        body: JSON.stringify({ id })
      });
    } else if (col === "teachers") {
      await apiFetch(`/teachers/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });
    } else if (col === "classes") {
      await apiFetch(`/classes/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });
    } else if (col === "materials") {
      await apiFetch(`/materials/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });
    } else if (col === "timetable") {
      await apiFetch(`/timetable/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });
    }
  } catch (err) {}
}

/**
 * Fetches latest records for a collection from the backend database endpoints
 */
async function fetchCollectionFromBackend(collectionName: string): Promise<any[] | null> {
  const col = collectionName.toLowerCase();
  try {
    let items: any[] = [];
    if (col === "students") {
      const res = await apiFetch("/students?page=1&page_size=100");
      items = Array.isArray(res) ? res : (res?.students || res?.data || []);
    } else if (col === "teachers") {
      const res = await apiFetch("/teachers");
      items = Array.isArray(res) ? res : (res?.teachers || res?.data || []);
    } else if (col === "classes") {
      const res = await apiFetch("/classes");
      items = Array.isArray(res) ? res : (res?.classes || res?.data || []);
    } else if (col === "materials") {
      const res = await apiFetch("/materials");
      items = Array.isArray(res) ? res : (res?.materials || res?.data || []);
    } else if (col === "timetable") {
      const res = await apiFetch("/timetable");
      items = Array.isArray(res) ? res : (res?.timetable || res?.sessions || res?.data || []);
    } else if (col === "notifications") {
      const res = await apiFetch("/notifications");
      items = Array.isArray(res) ? res : (res?.notifications || res?.data || []);
    } else {
      return null;
    }

    if (Array.isArray(items)) {
      // Clear old cached keys for this collection to purge deleted records
      const prefix = `tbf_db_${collectionName}/`;
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => {
        try { localStorage.removeItem(k); } catch {}
      });

      // Populate fresh items
      items.forEach(item => {
        const docId = String(item.id || item.regNo || item.email || item.student_id || item.name || `doc_${Date.now()}`);
        const key = `${prefix}${docId.replace(/\//g, "_").replace(/\./g, "_")}`;
        try {
          localStorage.setItem(key, JSON.stringify(item));
        } catch {}
      });
    }

    return items;
  } catch {
    return null;
  }
}

export function onSnapshot(
  ref: DbRef,
  callback: (snapshot: any) => void,
  _errorCallback?: (error: any) => void
): () => void {
  const isDocumentRef = ref.type === "doc" || Boolean(ref.id);
  const collectionName = ref.collection;
  const path = ref.path;

  const emit = () => {
    if (isDocumentRef) {
      const key = getStorageKey(path);
      let dataVal: any = null;
      let existsVal = false;
      try {
        const raw = localStorage.getItem(key);
        if (raw !== null) {
          dataVal = JSON.parse(raw);
          existsVal = true;
        }
      } catch (e) {}

      callback({
        exists: () => existsVal,
        data: () => dataVal,
        id: ref.id || path.split("/")[1] || "",
      });
      return;
    }

    // Collection reference
    const prefix = `tbf_db_${collectionName}/`;
    const list: any[] = [];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const storageKey = localStorage.key(i);
        if (storageKey && storageKey.startsWith(prefix)) {
          const docId = storageKey.substring(prefix.length);
          try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
              const data = JSON.parse(raw);
              list.push({
                id: docId,
                data: () => data,
                exists: () => true,
              });
            }
          } catch (e) {}
        }
      }
    } catch (e) {}

    callback({
      forEach: (fn: (doc: any) => void) => {
        list.forEach(fn);
      },
      docs: list,
      size: list.length,
      empty: list.length === 0,
    });
  };

  // Initial immediate notification from cache
  emit();

  // Intra-tab listener
  const listenerKey = isDocumentRef ? path : collectionName;
  if (!subscribers[listenerKey]) {
    subscribers[listenerKey] = new Set();
  }
  subscribers[listenerKey].add(emit);

  // Background sync with database endpoints
  let pollInterval: any = null;
  if (!isDocumentRef) {
    // Initial fetch from backend endpoint database
    fetchCollectionFromBackend(collectionName).then(items => {
      if (items !== null) {
        emit();
      }
    });

    // Periodic synchronization with backend database (every 4 seconds)
    pollInterval = setInterval(() => {
      fetchCollectionFromBackend(collectionName).then(items => {
        if (items !== null) {
          emit();
        }
      });
    }, 4000);
  } else if (collectionName === "class_chats" && ref.id) {
    // Live chat polling for classroom
    const fetchChat = async () => {
      try {
        const res = await apiFetch(`/classes/${encodeURIComponent(ref.id || "")}/chat`);
        if (res && Array.isArray(res.messages)) {
          const key = getStorageKey(path);
          localStorage.setItem(key, JSON.stringify({ messages: res.messages }));
          emit();
        }
      } catch {}
    };
    fetchChat();
    pollInterval = setInterval(fetchChat, 3000);
  } else if (collectionName === "forum" && ref.id) {
    // Classroom forum polling
    const fetchForum = async () => {
      try {
        const res = await apiFetch(`/discussions?class_name=${encodeURIComponent(ref.id || "")}`);
        const list = res?.discussions || res?.threads || (Array.isArray(res) ? res : []);
        if (Array.isArray(list)) {
          const mapped = list.map((t: any) => ({
            id: t.id,
            author: t.author?.first_name ? `${t.author.first_name} ${t.author.last_name || ""}`.trim() : (typeof t.author === "string" ? t.author : "Student Member"),
            role: t.author?.role ? (t.author.role === "teacher" ? "Teacher" : "Student") : "Student",
            avatar: (t.author?.first_name || t.author_name || "S")[0].toUpperCase(),
            content: t.content,
            time: t.created_at ? new Date(t.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : (t.time || "Recently"),
            upvotes: t.upvotes || 0,
            replies: (t.replies || []).map((r: any) => ({
              id: r.id,
              author: r.author?.first_name ? `${r.author.first_name} ${r.author.last_name || ""}`.trim() : (typeof r.author === "string" ? r.author : "Classmate"),
              content: r.content,
              time: r.created_at ? new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : (r.time || "Just now")
            }))
          }));
          const key = getStorageKey(path);
          localStorage.setItem(key, JSON.stringify({ posts: mapped }));
          emit();
        }
      } catch {}
    };
    fetchForum();
    pollInterval = setInterval(fetchForum, 4000);
  }

  // Cross-tab storage event handler
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key && e.key.startsWith(`tbf_db_${collectionName}`)) {
      emit();
    }
  };
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    if (pollInterval) clearInterval(pollInterval);
    window.removeEventListener("storage", handleStorageEvent);
    if (subscribers[listenerKey]) {
      subscribers[listenerKey].delete(emit);
      if (subscribers[listenerKey].size === 0) {
        delete subscribers[listenerKey];
      }
    }
  };
}

// Authentication stub / session helper
export const auth = {
  currentUser: null as any,
};
