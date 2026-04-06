'use client';

import { Play } from 'lucide-react';
import Image from 'next/image';

interface VideoCardProps {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  onClick: () => void;
}

export default function VideoCard({ title, channelName, thumbnailUrl, onClick }: VideoCardProps) {
  return (
    <div
      onClick={onClick}
      className="child-card cursor-pointer group"
    >
      <div className="relative aspect-video bg-gray-200">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={title || 'Video thumbnail'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-300">
            <Play className="w-12 h-12 text-gray-500" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
          <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all shadow-xl">
            <Play className="w-8 h-8 text-indigo-600 ml-1" />
          </div>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-800 line-clamp-2 mb-1">
          {title || 'Video'}
        </h3>
        <p className="text-sm text-gray-500 truncate">
          {channelName || 'Kanal'}
        </p>
      </div>
    </div>
  );
}