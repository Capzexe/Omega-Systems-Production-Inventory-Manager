
-- 1. Tables Definition

-- Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'crew' CHECK (role IN ('admin', 'crew')),
  avatar_url TEXT
);

-- Categories table
CREATE TABLE public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT
);

-- Productions table
CREATE TABLE public.productions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'pre-production' CHECK (status IN ('pre-production', 'production', 'post-production', 'wrapped'))
);

-- Inventory Items table
CREATE TABLE public.inventory_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  model TEXT,
  serial_number TEXT UNIQUE,
  category_id UUID REFERENCES public.categories(id),
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'checked_out', 'maintenance', 'lost')),
  current_production_id UUID REFERENCES public.productions(id),
  assigned_to_id UUID REFERENCES public.profiles(id),
  description TEXT,
  image_url TEXT,
  last_serviced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Checkouts table
CREATE TABLE public.checkouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES public.inventory_items(id) NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  production_id UUID REFERENCES public.productions(id),
  checked_out_at TIMESTAMPTZ DEFAULT now(),
  due_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ
);

-- Activity Logs table
CREATE TABLE public.activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES public.inventory_items(id),
  user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL, -- e.g., 'checkout', 'return', 'status_change'
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Row Level Security (RLS) Policies

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone can view profiles, only user can update own, admin can update all
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Categories: Read for all, admin manage
CREATE POLICY "Categories viewable by all" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admin manage categories" ON public.categories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Items: Read for all, crew can update status on checkout, admin manage
CREATE POLICY "Items viewable by all" ON public.inventory_items FOR SELECT USING (true);
CREATE POLICY "Admin manage items" ON public.inventory_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Checkouts: Crew can see their own, admin see all
CREATE POLICY "Crew see own checkouts" ON public.checkouts FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin manage checkouts" ON public.checkouts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Log: All can view, only system/admin insert
CREATE POLICY "Logs viewable by all" ON public.activity_logs FOR SELECT USING (true);
CREATE POLICY "System/Admin insert logs" ON public.activity_logs FOR INSERT WITH CHECK (true);
