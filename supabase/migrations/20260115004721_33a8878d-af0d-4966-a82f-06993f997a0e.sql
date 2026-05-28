-- Add video_url column to tutorials table for direct video uploads
ALTER TABLE public.tutorials 
ADD COLUMN video_url TEXT NULL;

-- Add comment to clarify usage
COMMENT ON COLUMN public.tutorials.video_url IS 'URL for directly uploaded video (alternative to youtube_id)';

-- Create storage bucket for tutorial videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('tutorial-videos', 'tutorial-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view tutorial videos (public bucket)
CREATE POLICY "Anyone can view tutorial videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'tutorial-videos');

-- Only admins can upload tutorial videos
CREATE POLICY "Admins can upload tutorial videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tutorial-videos' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Only admins can update tutorial videos
CREATE POLICY "Admins can update tutorial videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'tutorial-videos' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Only admins can delete tutorial videos
CREATE POLICY "Admins can delete tutorial videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'tutorial-videos' 
  AND public.has_role(auth.uid(), 'admin')
);