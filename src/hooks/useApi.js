import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export function useApi(url, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { checkAuth } = useAuth();

  const fetchData = useCallback(async () => {
    if (!url) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(url, { credentials: 'include' });

      if (res.status === 401) {
        await checkAuth();
        return;
      }

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [url, checkAuth]);

  useEffect(() => {
    if (options.skip) return;
    fetchData();
  }, [fetchData, options.skip]);

  return { data, loading, error, refetch: fetchData };
}
