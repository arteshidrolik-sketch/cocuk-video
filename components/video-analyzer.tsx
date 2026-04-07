'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Shield, AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';
import Image from 'next/image';

interface VideoAnalyzerProps {
  video: {
    videoId: string;
    title: string;
    channelId: string;
    channelName: string;
    thumbnailUrl: string;
    description?: string;
  };
  onClose: () => void;
  onApproved: () => void;
  onQuotaExceeded?: (data: { dailyVideoCount: number; freeVideoLimit: number; trialUsed: boolean }) => void;
}

type AnalysisStatus = 'analyzing' | 'approved' | 'rejected' | 'pending' | 'error';

export default function VideoAnalyzer({ video, onClose, onApproved, onQuotaExceeded }: VideoAnalyzerProps) {
  const [status, setStatus] = useState<AnalysisStatus>('analyzing');
  const [message, setMessage] = useState('Video analiz ediliyor...');
  const [reason, setReason] = useState('');

  const analyzeVideo = useCallback(async () => {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(video),
      });

      // Handle quota exceeded
      if (response.status === 429) {
        const data = await response.json();
        onClose();
        onQuotaExceeded?.({
          dailyVideoCount: data.dailyVideoCount ?? 5,
          freeVideoLimit: data.freeVideoLimit ?? 5,
          trialUsed: data.trialUsed ?? false,
        });
        return;
      }

      const parsed = await response.json();

      if (parsed.status === 'completed') {
        if (parsed.decision === 'UYGUN') {
          setStatus('approved');
          setMessage('Video uygun bulundu! 🎉');
          setReason(parsed.reason || '');
          setTimeout(() => onApproved(), 1500);
        } else if (parsed.decision === 'UYGUN_DEGIL') {
          setStatus('rejected');
          setMessage('Bu video yaş grubunuz için uygun değil');
          setReason(parsed.reason || '');
        } else {
          setStatus('pending');
          setMessage('Bu video ebeveyn onayı bekliyor');
          setReason(parsed.reason || '');
        }
      } else if (parsed.status === 'error') {
        setStatus('error');
        setMessage(parsed.message || 'Analiz sırasında hata oluştu');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setStatus('error');
      setMessage('Bağlantı hatası oluştu');
    }
  }, [video, onApproved]);

  useEffect(() => {
    analyzeVideo();
  }, [analyzeVideo]);

  const getStatusIcon = () => {
    switch (status) {
      case 'analyzing':
        return <Shield className="w-16 h-16 text-indigo-500 animate-pulse" />;
      case 'approved':
        return <CheckCircle className="w-16 h-16 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-16 h-16 text-red-500" />;
      case 'pending':
        return <Clock className="w-16 h-16 text-amber-500" />;
      case 'error':
        return <AlertTriangle className="w-16 h-16 text-red-500" />;
    }
  };

  const getStatusBg = () => {
    switch (status) {
      case 'analyzing': return 'bg-indigo-50';
      case 'approved': return 'bg-green-50';
      case 'rejected': return 'bg-red-50';
      case 'pending': return 'bg-amber-50';
      case 'error': return 'bg-red-50';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="relative aspect-video bg-gray-200">
          {video.thumbnailUrl ? (
            <Image
              src={video.thumbnailUrl}
              alt={video.title || 'Video'}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-300" />
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
          {status === 'analyzing' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="w-24 h-24 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>

        <div className={`p-6 ${getStatusBg()}`}>
          <div className="flex flex-col items-center text-center">
            {getStatusIcon()}
            <h3 className="text-xl font-bold mt-4 text-gray-800">
              {message}
            </h3>
            {reason && (
              <p className="text-sm text-gray-600 mt-2">
                {reason}
              </p>
            )}
            {status === 'analyzing' && (
              <p className="text-sm text-indigo-600 mt-4">
                🔍 Video içeriği AI tarafından kontrol ediliyor...
              </p>
            )}
            {(status === 'rejected' || status === 'pending' || status === 'error') && (
              <button
                onClick={onClose}
                className="mt-4 btn-primary"
              >
                Tamam
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}