'use client';

import { useState, useEffect, useRef } from 'react';
import { Lock, Search, ArrowLeft } from 'lucide-react';
import ParentLogin from './parent-login';
import { useRouter } from 'next/navigation';

interface ChildHeaderProps {
  onSearch: (query: string) => void;
  searchQuery: string;
}

export default function ChildHeader({ onSearch, searchQuery }: ChildHeaderProps) {
  const [showParentLogin, setShowParentLogin] = useState(false);
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Önerileri getir
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (localQuery.length < 2) {
        setSuggestions([]);
        return;
      }
      
      try {
        const res = await fetch(`/api/youtube/suggestions?q=${encodeURIComponent(localQuery)}`);
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      } catch {
        setSuggestions([]);
      }
    };

    const timeout = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeout);
  }, [localQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (localQuery.trim()) {
      onSearch(localQuery.trim());
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setLocalQuery(suggestion);
    setShowSuggestions(false);
    onSearch(suggestion);
  };

  // Sayfa dışına tıklanınca önerileri kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Geri Butonu - Logo Yerine */}
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 group"
              title="Geri Dön"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all">
                <ArrowLeft className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent hidden sm:block">
                GüvenliVideo
              </span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 max-w-xl relative">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={localQuery}
                onChange={(e) => {
                  setLocalQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {}}
                placeholder="Video ara... 🎬"
                className="w-full py-3 px-5 pl-12 rounded-2xl border-2 border-indigo-200 focus:border-indigo-400 bg-white text-lg transition-all"
                autoComplete="off"
              />
              <button
                type="submit"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-indigo-600 transition-colors"
                title="Ara"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>
            
            {/* Öneriler Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-indigo-100 overflow-hidden z-50">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors flex items-center gap-3 border-b border-gray-100 last:border-0"
                  >
                    <Search className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <span className="text-gray-700 truncate">{suggestion}</span>
                  </button>
                ))}
              </div>
            )}
          </form>

          <button
            onClick={() => setShowParentLogin(true)}
            className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all"
            title="Ebeveyn Paneli"
          >
            <Lock className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </header>

      {showParentLogin && (
        <ParentLogin onClose={() => setShowParentLogin(false)} />
      )}
    </>
  );
}