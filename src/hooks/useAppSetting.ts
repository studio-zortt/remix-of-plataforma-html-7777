import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAppSetting<T = unknown>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);

  const fetchValue = useCallback(async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (!error && data) {
      setValue(data.value as T);
    }
    setLoading(false);
  }, [key]);

  useEffect(() => {
    fetchValue();
  }, [fetchValue]);

  const updateValue = useCallback(
    async (newValue: T) => {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key, value: newValue as never, updated_at: new Date().toISOString() });
      if (!error) setValue(newValue);
      return !error;
    },
    [key]
  );

  return { value, loading, updateValue, refetch: fetchValue };
}
