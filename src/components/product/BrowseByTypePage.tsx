/**
 * Covasant Continuum — Browse by Type Page
 * Lists all artefacts of a specific type across all products.
 * Respects tenant visibility — customers only see permitted content.
 */

import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useAppStore } from '../../stores/appStore';
import { fetchArtefacts, getDownloadUrl, deleteArtefact } from '../../utils/api';

interface Artefact {
  id: string;
  title: string;
  description: string | null;
  artefact_type: string;
  visibility: string;
  status: string;
  version: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  video_url: string | null;
  view_count: number;
  download_count: number;
  created_at: string;
  product_id: string;
  sprint?: string | null;
  release?: string | null;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  'release-notes': { label: 'Release Notes', color: '#059669', icon: '📋' },
  video: { label: 'Videos', color: '#DC2626', icon: '🎬' },
  guide: { label: 'Guides', color: '#7C3AED', icon: '📖' },
  documentation: { label: 'Documentation', color: '#2563EB', icon: '📄' },
  newsletter: { label: 'Newsletters', color: '#D97706', icon: '📰' },
  'api-spec': { label: 'API Specifications', color: '#0D9488', icon: '⚡' },
};

function formatSize(bytes: number | null) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function BrowseByTypePage() {
  const { user } = useAuthStore();
  const filterType = useAppStore(s => s.filterType);
  const setView = useAppStore(s => s.setView);
  const [artefacts, setArtefacts] = useState<Artefact[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoPlayer, setVideoPlayer] = useState<{ url: string; title: string } | null>(null);
  const [documentPreview, setDocumentPreview] = useState<{ id: string; url: string; title: string; originalId: string } | null>(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const typeInfo = TYPE_CONFIG[filterType] || { label: filterType, color: '#6B7199', icon: '📁' };

  useEffect(() => {
    setLoading(true);
    fetchArtefacts(undefined, 100)
      .then(data => {
        const items = (data.items || data || []) as Artefact[];
        setArtefacts(items.filter(a => a.artefact_type === filterType));
      })
      .catch(() => setArtefacts([]))
      .finally(() => setLoading(false));
  }, [filterType]);

  const getEmbedUrl = (url: string): string | null => {
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/([\w-]+))/);
    if (ytMatch) return `https://www.youtube.com/embed/${url.match(/(?:v=|\/)([\w-]+)/)?.[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    const loomMatch = url.match(/loom\.com\/share\/([\w-]+)/);
    if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`;
    return null;
  };

  const handleDownload = async (id: string, fileName: string) => {
    try {
      const token = useAuthStore.getState().accessToken;
      const url = getDownloadUrl(id);
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = fileName || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(objectUrl);
      document.body.removeChild(a);
    } catch {
      alert('Failed to download document.');
    }
  };

  const handlePreview = async (id: string, title: string) => {
    try {
      useAppStore.getState().showToast('Loading preview...');
      const token = useAuthStore.getState().accessToken;
      const url = getDownloadUrl(id);
      
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Failed to load document');
      
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      setDocumentPreview({ id, url: objectUrl, title, originalId: id });
    } catch (error) {
      console.error('Preview error:', error);
      alert('Failed to preview document.');
    }
  };

  const handleRagClick = () => {
    if (!documentPreview) return;
    const { toggleChat, chatOpen, addChatMessage } = useAppStore.getState();
    if (!chatOpen) toggleChat();
    
    // Add a local bot message to simulate entering RAG mode
    addChatMessage({ 
      id: Date.now().toString(), 
      role: 'bot', 
      content: `I have loaded **${documentPreview.title}** into my context. You can now ask me questions about it!`, 
      timestamp: new Date() 
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      await deleteArtefact(id);
      setArtefacts(prev => prev.filter(a => a.id !== id));
    } catch {}
  };

  return (
    <div style={{ padding: '30px 40px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        <a onClick={() => setView('home' as any)} style={{ color: '#2563EB', cursor: 'pointer', fontWeight: 600, textDecoration: 'none' }}>Home</a>
        <span>›</span>
        <span style={{ fontWeight: 600, color: 'var(--t1)' }}>{typeInfo.label}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: `${typeInfo.color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22,
        }}>
          {typeInfo.icon}
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--t1)', margin: 0 }}>{typeInfo.label}</h1>
          <p style={{ fontSize: 13, color: 'var(--t3)', marginTop: 3, margin: 0 }}>
            {artefacts.length} {artefacts.length === 1 ? 'document' : 'documents'} across all products
          </p>
        </div>
      </div>

      {/* Type tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => useAppStore.getState().setFilterType(key)}
            style={{
              padding: '5px 14px', borderRadius: 6, fontSize: 11.5, fontWeight: 600,
              border: filterType === key ? `1.5px solid ${cfg.color}` : '1.5px solid var(--bd)',
              background: filterType === key ? `${cfg.color}10` : 'var(--card)',
              color: filterType === key ? cfg.color : 'var(--t3)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Documents list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--t3)' }}>Loading…</div>
      ) : artefacts.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 60, color: 'var(--t3)',
          background: 'var(--card)', borderRadius: 14, border: '1.5px dashed var(--bd)',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>No {typeInfo.label.toLowerCase()} found</div>
          <p style={{ fontSize: 12, marginTop: 6 }}>Upload content from any product page to see it here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {artefacts.map(a => (
            <div
              key={a.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--card)', border: '1.5px solid var(--bd)', borderRadius: 12,
                padding: '14px 20px', transition: 'border-color .15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#C7D2FE')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `${typeInfo.color}12`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={typeInfo.color} strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 3, fontSize: 11, color: 'var(--t3)' }}>
                    <span style={{ background: `${typeInfo.color}15`, color: typeInfo.color, padding: '1px 8px', borderRadius: 4, fontWeight: 700, fontSize: 10 }}>{typeInfo.label}</span>
                    {a.file_name && <span>{a.file_name}</span>}
                    <span>{formatSize(a.file_size)}</span>
                    {a.version && <span>v{a.version}</span>}
                    {a.sprint && <span style={{ background: 'var(--card)', border: '1px solid var(--bd)', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>{a.sprint}</span>}
                    {a.release && <span style={{ background: 'var(--card)', border: '1px solid var(--bd)', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>{a.release}</span>}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <div style={{ fontSize: 10, color: 'var(--t3)', textAlign: 'right', marginRight: 8 }}>
                  <div>{a.view_count} views · {a.download_count} downloads</div>
                  <div style={{ marginTop: 2 }}>{new Date(a.created_at).toLocaleDateString()}</div>
                </div>
                {a.video_url && (
                  <button onClick={() => setVideoPlayer({ url: a.video_url!, title: a.title })} title="Watch Video"
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid var(--bd)', background: 'var(--card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  </button>
                )}
                {!a.video_url && a.mime_type?.startsWith('video/') && a.file_name && (
                  <button onClick={() => setVideoPlayer({ url: getDownloadUrl(a.id), title: a.title })} title="Watch Video"
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid var(--bd)', background: 'var(--card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  </button>
                )}
                {a.file_name && !a.mime_type?.startsWith('video/') && (
                  <button onClick={() => handlePreview(a.id, a.title)} title="Preview"
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid var(--bd)', background: 'var(--card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  </button>
                )}
                {a.file_name && (
                  <button onClick={() => handleDownload(a.id, a.file_name || 'download')} title="Download"
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid var(--bd)', background: 'var(--card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </button>
                )}
                {isAdmin && (
                  <button onClick={() => handleDelete(a.id)} title="Delete"
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid var(--bd)', background: 'var(--card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Player Modal */}
      {videoPlayer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,18,53,.6)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setVideoPlayer(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#000', borderRadius: 16, width: '80vw', maxWidth: 900, overflow: 'hidden', boxShadow: '0 20px 80px rgba(0,0,0,.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', background: 'rgba(255,255,255,.06)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{videoPlayer.title}</div>
              <button onClick={() => setVideoPlayer(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>
            {(() => {
              const embedUrl = getEmbedUrl(videoPlayer.url);
              if (embedUrl) {
                return <iframe src={embedUrl} style={{ width: '100%', aspectRatio: '16/9', border: 'none' }} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />;
              }
              return (
                <video controls autoPlay style={{ width: '100%', aspectRatio: '16/9', background: '#000' }}>
                  <source src={videoPlayer.url} />
                  Your browser does not support the video tag.
                </video>
              );
            })()}
          </div>
        </div>
      )}
      {/* Document Preview Modal */}
      {documentPreview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,18,53,.6)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => {
            if (documentPreview.url.startsWith('blob:')) window.URL.revokeObjectURL(documentPreview.url);
            setDocumentPreview(null);
          }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '90vw', height: '90vh', maxWidth: 1200, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 80px rgba(0,0,0,.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid var(--bd)', background: 'linear-gradient(135deg,var(--blue),var(--pur))' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{documentPreview.title}</div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {isAdmin && (
                  <button onClick={handleRagClick} style={{ padding: '6px 14px', borderRadius: 6, background: '#fff', color: 'var(--pur)', border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>RAG</button>
                )}
                <button onClick={() => {
                  if (documentPreview.url.startsWith('blob:')) window.URL.revokeObjectURL(documentPreview.url);
                  setDocumentPreview(null);
                }} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>✕</button>
              </div>
            </div>
            <div style={{ flex: 1, position: 'relative', background: '#e5e7eb' }}>
              <iframe src={documentPreview.url} style={{ width: '100%', height: '100%', border: 'none' }} title={documentPreview.title} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
