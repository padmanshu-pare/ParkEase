import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../services/api';

const FacilityContext = createContext(null);
export const useFacility = () => useContext(FacilityContext);

const KEY = 'parkease_facility';

export function FacilityProvider({ children }) {
  const [facilities, setFacilities] = useState([]);
  const [selectedId, setSelectedId] = useState(localStorage.getItem(KEY) || '');
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data } = await api.get('/facilities');
    setFacilities(data);
    setSelectedId((cur) => {
      const next = data.some((f) => f._id === cur) ? cur : data.find((f) => f.isActive)?._id || data[0]?._id || '';
      localStorage.setItem(KEY, next);
      return next;
    });
    setLoading(false);
  }, []);

  useEffect(() => { reload().catch(() => setLoading(false)); }, [reload]);

  const select = (id) => { localStorage.setItem(KEY, id); setSelectedId(id); };
  const selected = facilities.find((f) => f._id === selectedId) || null;

  return <FacilityContext.Provider value={{ facilities, selected, selectedId, select, reload, loading }}>{children}</FacilityContext.Provider>;
}
