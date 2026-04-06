import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { search } from '../services/searchService';
import SearchResultCard from '../components/SearchResultCard';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const region = searchParams.get('region') || '';
  const language = searchParams.get('language') || '';

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    search(q, region, language)
      .then((data) => { if (!cancelled) setResults(data); })
      .catch(() => { if (!cancelled) setError('Could not load results.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [q, region, language]);

  return (
    <main>
      <h1>Search</h1>
      {loading && <p>Loading...</p>}
      {error && <p>{error}</p>}
      {!loading && !error && results.length === 0 && (
        <p>No results found. Try a different keyword or region.</p>
      )}
      {!loading && !error && results.length > 0 && (
        <section>
          {results.map((result) => (
            <SearchResultCard key={`${result.type}-${result.id}`} result={result} />
          ))}
        </section>
      )}
    </main>
  );
}
