
export type Role = 'admin' | 'crew';
export type ItemStatus = 'available' | 'checked_out' | 'maintenance' | 'lost';
export type ProductionStatus = 'pre-production' | 'production' | 'post-production' | 'wrapped';

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  avatar_url?: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
}

export interface Production {
  id: string;
  name: string;
  location?: string;
  start_date: string;
  end_date: string;
  status: ProductionStatus;
}

export interface InventoryItem {
  id: string;
  name: string;
  model: string;
  serial_number: string;
  category_id: string;
  status: ItemStatus;
  current_production_id?: string;
  assigned_to_id?: string;
  description?: string;
  image_url?: string;
  last_serviced_at?: string;
  created_at: string;
  category?: Category;
  assigned_to?: Profile;
  production?: Production;
}

export interface Checkout {
  id: string;
  item_id: string;
  user_id: string;
  production_id?: string;
  checked_out_at: string;
  due_at?: string;
  returned_at?: string;
  item?: InventoryItem;
  user?: Profile;
}

export interface ActivityLog {
  id: string;
  item_id?: string;
  user_id?: string;
  action: string;
  details?: any;
  created_at: string;
  item?: InventoryItem;
  user?: Profile;
}
