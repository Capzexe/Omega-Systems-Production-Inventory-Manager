import { InventoryItem, Category, Profile, Production, ActivityLog, ItemStatus } from '../types';

// -----------------------------------------------------------------------------
// Database Settings (stored in local storage for modular persistence)
// -----------------------------------------------------------------------------
export const getDbMode = (): 'mock' | 'mysql' => {
  const saved = localStorage.getItem('OMEGA_DB_MODE');
  if (saved === 'mock' || saved === 'mysql') {
    return saved;
  }
  
  // Auto-detect environment:
  // If running on local/preview, default to mock sandbox mode
  // If running on live production Hostinger domain, default directly to mysql mode
  const isStagingOrDev = 
    window.location.hostname.includes('localhost') || 
    window.location.hostname.includes('127.0.0.1') || 
    window.location.hostname.includes('run.app');
    
  return isStagingOrDev ? 'mock' : 'mysql';
};

export const setDbMode = (mode: 'mock' | 'mysql') => {
  localStorage.setItem('OMEGA_DB_MODE', mode);
};

export const getBackendUrl = (): string => {
  const url = localStorage.getItem('OMEGA_DB_URL') || '/api.php';
  
  // Resolve relative /api.php to the absolute URL in dev/preview so we don't get 404
  const isStagingOrDev = 
    window.location.hostname.includes('localhost') || 
    window.location.hostname.includes('127.0.0.1') || 
    window.location.hostname.includes('run.app');
    
  if (isStagingOrDev && (url === '/api.php' || !url.startsWith('http'))) {
    return 'https://ghostwhite-sardine-651089.hostingersite.com/api.php';
  }
  
  return url;
};

export const setBackendUrl = (url: string) => {
  localStorage.setItem('OMEGA_DB_URL', url);
};

// -----------------------------------------------------------------------------
// Fallback / Initial Mock Data (In-Memory Sandbox Database)
// -----------------------------------------------------------------------------
const MOCK_CATEGORIES: Category[] = [
  { id: '1', name: 'Cameras', icon: 'Camera' },
  { id: '2', name: 'Lenses', icon: 'Disc' },
  { id: '3', name: 'Lighting', icon: 'Sun' },
  { id: '4', name: 'Audio', icon: 'Mic' },
  { id: '5', name: 'Power', icon: 'Battery' },
];

const MOCK_PROFILES: Profile[] = [
  { id: 'u1', full_name: 'Alex Rivera', role: 'admin', avatar_url: 'https://picsum.photos/seed/alex/100/100' },
  { id: 'u2', full_name: 'Jordan Smith', role: 'crew', avatar_url: 'https://picsum.photos/seed/jordan/100/100' },
];

const MOCK_PRODUCTIONS: Production[] = [
  { id: 'p1', name: 'Midnight Streets', location: 'Downtown LA', start_date: '2024-05-01', end_date: '2024-05-15', status: 'production' },
  { id: 'p2', name: 'The Silent Cabin', location: 'Vermont', start_date: '2024-06-10', end_date: '2024-07-05', status: 'pre-production' },
];

let MOCK_ITEMS: InventoryItem[] = [
  { id: 'i1', name: 'ARRI Alexa Mini LF', model: 'Mini LF', serial_number: 'AX-1203', category_id: '1', status: 'checked_out', assigned_to_id: 'u2', current_production_id: 'p1', created_at: new Date().toISOString() },
  { id: 'i2', name: 'Sony FX6', model: 'ILME-FX6V', serial_number: 'SN-4055', category_id: '1', status: 'available', created_at: new Date().toISOString() },
  { id: 'i3', name: 'Cooke S4/i 35mm', model: 'S4/i', serial_number: 'CK-3501', category_id: '2', status: 'checked_out', assigned_to_id: 'u2', current_production_id: 'p1', created_at: new Date().toISOString() },
  { id: 'i4', name: 'Aputure 600d Pro', model: '600d Pro', serial_number: 'AP-6001', category_id: '3', status: 'available', created_at: new Date().toISOString() },
  { id: 'i5', name: 'Sennheiser MKH 416', model: 'MKH 416', serial_number: 'SH-4160', category_id: '4', status: 'maintenance', created_at: new Date().toISOString() },
];

let MOCK_LOGS: ActivityLog[] = [
  { id: 'l1', item_id: 'i1', user_id: 'u2', action: 'Checkout', created_at: new Date(Date.now() - 86400000).toISOString(), details: { production: 'Midnight Streets' } },
  { id: 'l2', item_id: 'i3', user_id: 'u2', action: 'Checkout', created_at: new Date(Date.now() - 43200000).toISOString(), details: { production: 'Midnight Streets' } },
];

// -----------------------------------------------------------------------------
// Real MySQL HTTP Fetch Implementation
// -----------------------------------------------------------------------------
async function fetchFromApi(endpointQuery: string, options: RequestInit = {}): Promise<any> {
  const url = getBackendUrl();
  const delimiter = url.includes('?') ? '&' : '?';
  const requestUrl = `${url}${delimiter}${endpointQuery}`;
  
  const response = await fetch(requestUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const detailMsg = errorBody.details ? ` (Database details: ${typeof errorBody.details === 'string' ? errorBody.details : JSON.stringify(errorBody.details)})` : '';
    const throwMsg = (errorBody.error || `HTTP error! status: ${response.status}`) + detailMsg;
    throw new Error(throwMsg);
  }

  return response.json();
}

// -----------------------------------------------------------------------------
// Unified Service Interface (Transparently delegates to MySQL or Mock)
// -----------------------------------------------------------------------------
export const mockSupabase = {
  items: {
    getAll: async (): Promise<InventoryItem[]> => {
      if (getDbMode() === 'mysql') {
        try {
          return await fetchFromApi('action=items');
        } catch (err: any) {
          console.warn('MySQL items fetch failed, using sandbox fallback:', err);
          window.dispatchEvent(new CustomEvent('database-connection-failed', { detail: err.message }));
        }
      }
      
      // Fallback
      return MOCK_ITEMS.map(item => ({
        ...item,
        category: MOCK_CATEGORIES.find(c => c.id === item.category_id),
        assigned_to: MOCK_PROFILES.find(p => p.id === item.assigned_to_id),
        production: MOCK_PRODUCTIONS.find(p => p.id === item.current_production_id),
      }));
    },

    update: async (id: string, updates: Partial<InventoryItem>): Promise<InventoryItem | undefined> => {
      if (getDbMode() === 'mysql') {
        try {
          const result = await fetchFromApi('action=change_status', {
            method: 'POST',
            body: JSON.stringify({ id, ...updates })
          });
          if (result.success) {
            const fetched = await fetchFromApi('action=items');
            return fetched.find((i: any) => i.id === id);
          }
        } catch (err: any) {
          console.warn('MySQL status change failed. Falling back to sandbox:', err);
          window.dispatchEvent(new CustomEvent('database-connection-failed', { detail: err.message }));
        }
      }

      // Mock
      MOCK_ITEMS = MOCK_ITEMS.map(i => i.id === id ? { ...i, ...updates } : i);
      return MOCK_ITEMS.find(i => i.id === id);
    },

    create: async (itemData: Omit<InventoryItem, 'id' | 'created_at'>): Promise<InventoryItem> => {
      if (getDbMode() === 'mysql') {
        try {
          const result = await fetchFromApi('action=create_item', {
            method: 'POST',
            body: JSON.stringify(itemData)
          });
          if (result.success && result.id) {
            const items = await fetchFromApi('action=items');
            const created = items.find((i: any) => i.id === result.id);
            if (created) return created;
          }
          throw new Error("Could not fetch the newly created equipment.");
        } catch (err: any) {
          console.warn('MySQL create item failed. Falling back to sandbox:', err);
          window.dispatchEvent(new CustomEvent('database-connection-failed', { detail: err.message }));
        }
      }

      // Mock
      const newItem: InventoryItem = {
        ...itemData,
        id: 'i' + (MOCK_ITEMS.length + 1) + Math.random().toString(36).substr(2, 4),
        created_at: new Date().toISOString()
      };
      MOCK_ITEMS.push(newItem);
      
      const log: ActivityLog = {
        id: Math.random().toString(36).substr(2, 9),
        item_id: newItem.id,
        user_id: 'u1',
        action: 'Add Equipment',
        created_at: new Date().toISOString(),
        details: { model: newItem.model }
      };
      MOCK_LOGS = [log, ...MOCK_LOGS];
      return newItem;
    },

    changeStatus: async (id: string, status: ItemStatus): Promise<boolean> => {
      if (getDbMode() === 'mysql') {
        try {
          const result = await fetchFromApi('action=change_status', {
            method: 'POST',
            body: JSON.stringify({ id, status })
          });
          return !!result.success;
        } catch (err: any) {
          console.warn('MySQL status modification API failed. Falling back to sandbox:', err);
          window.dispatchEvent(new CustomEvent('database-connection-failed', { detail: err.message }));
        }
      }

      // Mock
      const item = MOCK_ITEMS.find(i => i.id === id);
      if (item) {
        let action = 'Status Update';
        if (status === 'maintenance') action = 'Send to Maintenance';
        else if (status === 'available') action = 'Refurbish / Complete Maintenance';

        const prevStatus = item.status;
        MOCK_ITEMS = MOCK_ITEMS.map(i => i.id === id ? { 
          ...i, 
          status,
          ...(status === 'maintenance' || status === 'lost' ? { assigned_to_id: undefined, current_production_id: undefined } : {})
        } : i);

        const log: ActivityLog = {
          id: Math.random().toString(36).substr(2, 9),
          item_id: id,
          user_id: 'u1',
          action: action,
          created_at: new Date().toISOString(),
          details: { previous_status: prevStatus, new_status: status }
        };
        MOCK_LOGS = [log, ...MOCK_LOGS];
        return true;
      }
      return false;
    },

    checkout: async (itemId: string, userId: string, prodId: string): Promise<boolean> => {
      if (getDbMode() === 'mysql') {
        try {
          const result = await fetchFromApi('action=checkout', {
            method: 'POST',
            body: JSON.stringify({ itemId, userId, prodId })
          });
          return !!result.success;
        } catch (err: any) {
          console.warn('MySQL checkout API failed. Falling back to sandbox:', err);
          window.dispatchEvent(new CustomEvent('database-connection-failed', { detail: err.message }));
        }
      }

      // Mock
      const item = MOCK_ITEMS.find(i => i.id === itemId);
      if (item && item.status === 'available') {
        const updates: Partial<InventoryItem> = {
          status: 'checked_out',
          assigned_to_id: userId,
          current_production_id: prodId
        };
        MOCK_ITEMS = MOCK_ITEMS.map(i => i.id === itemId ? { ...i, ...updates } : i);
        
        const log: ActivityLog = {
          id: Math.random().toString(36).substr(2, 9),
          item_id: itemId,
          user_id: userId,
          action: 'Checkout',
          created_at: new Date().toISOString(),
          details: { production: MOCK_PRODUCTIONS.find(p => p.id === prodId)?.name || 'Unknown' }
        };
        MOCK_LOGS = [log, ...MOCK_LOGS];
        return true;
      }
      return false;
    },

    return: async (itemId: string): Promise<boolean> => {
      if (getDbMode() === 'mysql') {
        try {
          const result = await fetchFromApi('action=return', {
            method: 'POST',
            body: JSON.stringify({ itemId })
          });
          return !!result.success;
        } catch (err: any) {
          console.warn('MySQL return API failed. Falling back to sandbox:', err);
          window.dispatchEvent(new CustomEvent('database-connection-failed', { detail: err.message }));
        }
      }

      // Mock
      const item = MOCK_ITEMS.find(i => i.id === itemId);
      if (item) {
        const log: ActivityLog = {
          id: Math.random().toString(36).substr(2, 9),
          item_id: itemId,
          user_id: item.assigned_to_id || 'u2',
          action: 'Return',
          created_at: new Date().toISOString(),
          details: { production: item.current_production_id ? MOCK_PRODUCTIONS.find(p => p.id === item.current_production_id)?.name : undefined }
        };
        MOCK_LOGS = [log, ...MOCK_LOGS];
        
        MOCK_ITEMS = MOCK_ITEMS.map(i => i.id === itemId ? { 
          ...i, 
          status: 'available', 
          assigned_to_id: undefined, 
          current_production_id: undefined 
        } : i);
        return true;
      }
      return false;
    }
  },

  categories: {
    getAll: async (): Promise<Category[]> => {
      if (getDbMode() === 'mysql') {
        try {
          return await fetchFromApi('action=categories');
        } catch (err: any) {
          console.warn('MySQL categories fetch failed, using sandbox fallback:', err);
          window.dispatchEvent(new CustomEvent('database-connection-failed', { detail: err.message }));
        }
      }
      return MOCK_CATEGORIES;
    },
  },

  profiles: {
    getAll: async (): Promise<Profile[]> => {
      if (getDbMode() === 'mysql') {
        try {
          return await fetchFromApi('action=profiles');
        } catch (err: any) {
          console.warn('MySQL profiles fetch failed, using sandbox fallback:', err);
          window.dispatchEvent(new CustomEvent('database-connection-failed', { detail: err.message }));
        }
      }
      return MOCK_PROFILES;
    },
    getMe: async (): Promise<Profile> => {
      if (getDbMode() === 'mysql') {
        try {
          return await fetchFromApi('action=me');
        } catch (err: any) {
          console.warn('MySQL current user fetch failed, using sandbox fallback:', err);
          window.dispatchEvent(new CustomEvent('database-connection-failed', { detail: err.message }));
        }
      }
      return MOCK_PROFILES[0];
    },
  },

  productions: {
    getAll: async (): Promise<Production[]> => {
      if (getDbMode() === 'mysql') {
        try {
          return await fetchFromApi('action=productions');
        } catch (err: any) {
          console.warn('MySQL productions fetch failed, using sandbox fallback:', err);
          window.dispatchEvent(new CustomEvent('database-connection-failed', { detail: err.message }));
        }
      }
      return MOCK_PRODUCTIONS;
    },
  },

  logs: {
    getAll: async (): Promise<ActivityLog[]> => {
      if (getDbMode() === 'mysql') {
        try {
          return await fetchFromApi('action=logs');
        } catch (err: any) {
          console.warn('MySQL logs fetch failed, using sandbox fallback:', err);
          window.dispatchEvent(new CustomEvent('database-connection-failed', { detail: err.message }));
        }
      }
      
      // Fallback
      return MOCK_LOGS.map(log => ({
        ...log,
        item: MOCK_ITEMS.find(i => i.id === log.item_id),
        user: MOCK_PROFILES.find(p => p.id === log.user_id),
      }));
    }
  }
};
