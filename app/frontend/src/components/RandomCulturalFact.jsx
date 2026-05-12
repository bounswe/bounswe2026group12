import { useEffect, useState } from 'react';
import CulturalFactCard from './CulturalFactCard';
import { fetchRandomCulturalFact } from '../services/culturalFactService';

export default function RandomCulturalFact() {
  const [fact, setFact] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchRandomCulturalFact()
      .then((data) => { if (!cancelled) setFact(data); })
      .catch(() => { if (!cancelled) setFact(null); });
    return () => { cancelled = true; };
  }, []);

  if (!fact) return null;
  return <CulturalFactCard fact={fact} />;
}
