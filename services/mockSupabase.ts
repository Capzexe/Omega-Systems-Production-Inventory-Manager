
import { InventoryItem, Category, Profile, Production, ActivityLog, ItemStatus } from '../types';

// Mock Data
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

export const mockSupabase = {
  items: {
    getAll: async () => {
      return MOCK_ITEMS.map(item => ({
        ...item,
        category: MOCK_CATEGORIES.find(c => c.id === item.category_id),
        assigned_to: MOCK_PROFILES.find(p => p.id === item.assigned_to_id),
        production: MOCK_PRODUCTIONS.find(p => p.id === item.current_production_id),
      }));
    },
    update: async (id: string, updates: Partial<InventoryItem>) => {
      MOCK_ITEMS = MOCK_ITEMS.map(i => i.id === id ? { ...i, ...updates } : i);
      return MOCK_ITEMS.find(i => i.id === id);
    },
    checkout: async (itemId: string, userId: string, prodId: string) => {
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
          details: { production_id: prodId }
        };
        MOCK_LOGS = [log, ...MOCK_LOGS];
        return true;
      }
      return false;
    },
    return: async (itemId: string) => {
      const item = MOCK_ITEMS.find(i => i.id === itemId);
      if (item) {
        const log: ActivityLog = {
          id: Math.random().toString(36).substr(2, 9),
          item_id: itemId,
          user_id: item.assigned_to_id,
          action: 'Return',
          created_at: new Date().toISOString(),
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
    getAll: async () => MOCK_CATEGORIES,
  },
  profiles: {
    getAll: async () => MOCK_PROFILES,
    getMe: async () => MOCK_PROFILES[0], // Simulated logged in user (Admin)
  },
  productions: {
    getAll: async () => MOCK_PRODUCTIONS,
  },
  logs: {
    getAll: async () => {
        return MOCK_LOGS.map(log => ({
            ...log,
            item: MOCK_ITEMS.find(i => i.id === log.item_id),
            user: MOCK_PROFILES.find(p => p.id === log.user_id),
        }));
    }
  }
};
