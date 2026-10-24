import { supabase, isSupabaseConfigured, authFetch, getAccessToken } from './supabase';
import { apiUrl } from './apiConfig';

/**
 * Send a message with strict validation and dual persistence (Supabase direct or backend proxy)
 * @param {string} requestId - The active request or conversation thread ID
 * @param {string} senderId - ID of sender (e.g. 'COMP001', 'FL001')
 * @param {'company'|'freelancer'} senderRole - Role of the sender
 * @param {string} textContent - The message text
 */
export async function sendChatMessage(requestId, senderId, senderRole, textContent) {
  if (!requestId || typeof requestId !== 'string') {
    return { success: false, error: 'Valid request_id is required' };
  }
  if (!textContent || typeof textContent !== 'string' || !textContent.trim()) {
    return { success: false, error: 'Message content cannot be empty' };
  }
  if (textContent.trim().length > 2000) {
    return { success: false, error: 'Message exceeds maximum length of 2000 characters' };
  }

function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

  const messageId = generateUUID();
  const now = new Date().toISOString();

  const payload = {
    message_id: messageId,
    request_id: requestId,
    sender_id: senderId || 'user',
    sender_role: senderRole || 'company',
    content: textContent.trim(),
    timestamp: now
  };

  // Attempt 1: Direct Supabase insert if valid client configured
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([payload])
        .select();

      if (!error && data && data.length > 0) {
        return { success: true, data: data[0] };
      }
      if (error) {
        console.warn('Supabase direct insert error, falling back to server API:', error.message);
      }
    } catch (err) {
      console.warn('Supabase network error, trying server API fallback:', err);
    }
  }

  // Attempt 2: Express Server API endpoint /api/messages with Bearer token
  try {
    const res = await authFetch(apiUrl('/api/messages'), {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const result = await res.json();
      return { success: true, data: result.data || payload };
    } else {
      const errJson = await res.json().catch(() => ({}));
      return { success: false, error: errJson.error || 'Server rejected message write' };
    }
  } catch (err) {
    console.error('All message persistence paths failed:', err);
    return { success: false, error: 'Unable to reach messaging server. Please verify network connection.' };
  }
}

/**
 * Fetch messages with explicit success, data, and error status for robust UI state handling
 * @param {string} requestId 
 */
export async function fetchChatMessagesResult(requestId) {
  if (!requestId) return { success: true, data: [], error: null };

  // Attempt 1: Direct Supabase query if configured
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('request_id', requestId)
        .order('timestamp', { ascending: true });

      if (!error && Array.isArray(data)) {
        return { success: true, data, error: null };
      }
      if (error) {
        console.warn('Supabase fetch error, checking API proxy:', error.message);
      }
    } catch (err) {
      console.warn('Supabase direct fetch error:', err);
    }
  }

  // Attempt 2: Express Server API endpoint /api/messages/:requestId with Bearer token
  try {
    // Resolve token from localStorage directly or active session
    let token = localStorage.getItem("token");
    if (!token || token === "undefined" || token === "null") {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) {
            token = JSON.parse(localStorage.getItem(k) || "{}")?.access_token;
            if (token) break;
          }
        }
      } catch (_) {}
    }
    if (!token || token === "undefined" || token === "null") {
      token = await getAccessToken();
    }

    const headers = {
      "Content-Type": "application/json"
    };

    if (token && token !== "undefined" && token !== "null") {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(apiUrl(`/api/messages/${encodeURIComponent(requestId)}`), {
      method: "GET",
      headers
    });

    if (res.status === 401) {
      console.error("401 Unauthorized: Check if token exists in localStorage:", token);
    }

    if (res.ok) {
      const result = await res.json();
      return { 
        success: true, 
        data: result.data || result.messages || [],
        error: null 
      };
    }
    const errData = await res.json().catch(() => ({}));
    return { 
      success: false, 
      data: [], 
      error: errData.error || errData.message || `Server responded with ${res.status}` 
    };
  } catch (err) {
    return { 
      success: false, 
      data: [], 
      error: err.message || 'Unable to connect to messaging server' 
    };
  }
}

/**
 * Fetch messages for a specific conversation requestId ordered by timestamp
 * Backward-compatible helper returning plain array
 * @param {string} requestId 
 */
export async function fetchChatMessages(requestId) {
  const result = await fetchChatMessagesResult(requestId);
  return result.data || [];
}

/**
 * Subscribe to realtime incoming messages for a specific requestId
 * @param {string} requestId 
 * @param {(message: any) => void} onMessageReceived 
 * @returns {() => void} Unsubscribe function
 */
export function subscribeToMessages(requestId, onMessageReceived) {
  if (!isSupabaseConfigured || !supabase || !requestId) {
    return () => {};
  }

  try {
    const channelName = `room:${requestId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `request_id=eq.${requestId}`
        },
        (payload) => {
          if (payload && payload.new && typeof onMessageReceived === 'function') {
            onMessageReceived(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (err) {
        console.warn('Error removing realtime channel:', err);
      }
    };
  } catch (err) {
    console.warn('Failed to subscribe to realtime channel:', err);
    return () => {};
  }
}

