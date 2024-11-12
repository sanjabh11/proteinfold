// src/pages/Search.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Protein } from '../types';

const Search: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [proteins, setProteins] = useState<Protein[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const results = await api.searchProteins(query);
      setProteins(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while searching');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for proteins (e.g., insulin)"
            className="flex-1 p-2 border rounded"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-blue-300"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {proteins.length > 0 && (
        <div className="grid gap-4">
          {proteins.map((protein) => (
            <div
              key={protein.id}
              className="border rounded p-4 hover:bg-gray-50"
            >
              <h3 className="text-lg font-semibold">{protein.name}</h3>
              <p className="text-gray-600">{protein.description}</p>
              <div className="mt-2 text-sm">
                <p>Length: {protein.length} amino acids</p>
                <p>Organism: {protein.organism}</p>
                <p>UniProt ID: {protein.uniprotId}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && proteins.length === 0 && query && (
        <p className="text-gray-600">No results found for "{query}"</p>
      )}
    </div>
  );
};

export default Search;