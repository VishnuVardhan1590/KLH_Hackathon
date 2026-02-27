
-- Create members table
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'Silver' CHECK (tier IN ('Platinum', 'Gold', 'Silver')),
  member_since DATE NOT NULL DEFAULT CURRENT_DATE,
  flights INTEGER NOT NULL DEFAULT 0,
  photo_url TEXT,
  passport_number TEXT NOT NULL,
  nationality TEXT NOT NULL,
  last_access TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS but allow public access (kiosk system)
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON public.members FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.members FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.members FOR DELETE USING (true);

-- Create storage bucket for member photos
INSERT INTO storage.buckets (id, name, public) VALUES ('member-photos', 'member-photos', true);

CREATE POLICY "Allow public upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'member-photos');
CREATE POLICY "Allow public read photos" ON storage.objects FOR SELECT USING (bucket_id = 'member-photos');
