'use client';

import { useState } from 'react';
import { Lock, Shield, Search } from 'lucide-react';
import ParentLogin from './parent-login';

interface ChildHeaderProps {
  onSearch: (query: string) => void;
  searchQuery: string;
}

export default function ChildHeader({ onSearch, searchQuery }: ChildHeaderProps) {
  const [showParentLogin, setShowParentLogin] = useState(false);
  const [localQuery, setLocalQuery] = useState(searchQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localQuery.trim()) {
      onSearch(localQuery.trim());
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent hidden sm:block">
              GüvenliVideo
            </span>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 max-w-xl">
            <div className="relative">
              <input
                type="text"
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                placeholder="Video ara... 🎬"
                className="w-full py-3 px-5 pl-12 rounded-2xl border-2 border-indigo-200 focus:border-indigo-400 bg-white text-lg transition-all"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Ara
              </button>
            </div>
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