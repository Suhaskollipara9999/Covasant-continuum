/**
 * Covasant Continuum — Product Detail Page
 * Shows all documents for a product. Admins see upload. All roles can download.
 */

import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useAppStore } from '../../stores/appStore';
import { fetchProduct, fetchArtefacts, uploadDocument, deleteArtefact, getDownloadUrl } from '../../utils/api';

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
  sprint?: string | null;
  release?: string | null;
}

interface ProductInfo {
  id: string;
  name: string;
  full_name: string;
  description: string | null;
  color: string;
  artefact_count: number;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  'release-notes': { label: 'Release Notes', color: '#059669' },
  video: { label: 'Video', color: '#DC2626' },
  guide: { label: 'Guide', color: '#7C3AED' },
  documentation: { label: 'Documentation', color: '#2563EB' },
  newsletter: { label: 'Newsletter', color: '#D97706' },
  'api-spec': { label: 'API Specification', color: '#0D9488' },
};

function formatSize(bytes: number | null) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function ProductDetailPage() {
  const { user } = useAuthStore();
  const prod = useAppStore(s => s.prod);
  const setView = useAppStore(s => s.setView);

  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [artefacts, setArtefacts] = useState<Artefact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({ title: '', description: '', artefact_type: 'documentation', video_url: '', sprint: '', release: '' });
  const [videoPlayer, setVideoPlayer] = useState<{ url: string; title: string } | null>(null);
  const [documentPreview, setDocumentPreview] = useState<{ id: string; url: string; title: string; originalId: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [filterType, setFilterType] = useState('all');

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const load = async () => {
    if (!prod) return;
    try {
      const [p, a] = await Promise.all([fetchProduct(prod), fetchArtefacts(prod)]);
      setProduct(p);
      setArtefacts(a.items || []);
    } catch {
      setProduct(null);
      setArtefacts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [prod]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prod) return;
    if (!uploadFile && !uploadForm.video_url) { setUploadError('Please provide a file or video URL'); return; }
    setUploading(true);
    setUploadError('');
    try {
      await uploadDocument(uploadFile, prod, uploadForm.title, uploadForm.artefact_type, 'internal', uploadForm.description, uploadForm.video_url || undefined, uploadForm.sprint || undefined, uploadForm.release || undefined);
      setShowUpload(false);
      setUploadFile(null);
      setUploadForm({ title: '', description: '', artefact_type: 'documentation', video_url: '', sprint: '', release: '' });
      load();
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getEmbedUrl = (url: string): string | null => {
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    // Loom
    const loomMatch = url.match(/loom\.com\/share\/([\w-]+)/);
    if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`;
    return null;
  };

  const handleDownload = async (id: string, fileName: string) => {
    try {
      const token = useAuthStore.getState().accessToken;
      const url = getDownloadUrl(id);
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
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
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download document. Please check your permissions.');
    }
  };

  const handlePreview = async (id: string, title: string) => {
    try {
      useAppStore.getState().showToast('Loading preview...');
      const token = useAuthStore.getState().accessToken;
      const url = getDownloadUrl(id);
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to load document');
      
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      setDocumentPreview({ id, url: objectUrl, title, originalId: id });
    } catch (error) {
      console.error('Preview error:', error);
      alert('Failed to preview document. It might not be a supported format or requires permissions.');
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
      load();
    } catch {}
  };

  const filteredArtefacts = filterType === 'all' ? artefacts : artefacts.filter(a => a.artefact_type === filterType);

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--t3)' }}>Loading…</div>;
  if (!product) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--t3)' }}>Product not found</div>;

  return (
    <div style={{ padding: '30px 40px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        <a onClick={() => setView('products' as any)} style={{ color: '#2563EB', cursor: 'pointer', fontWeight: 600, textDecoration: 'none' }}>Products</a>
        <span>›</span>
        <span style={{ fontWeight: 600, color: 'var(--t1)' }}>{product.name}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: `${product.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: product.color }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--t1)', margin: 0 }}>{product.full_name}</h1>
            {product.description && <p style={{ fontSize: 13, color: 'var(--t3)', marginTop: 3, margin: 0 }}>{product.description}</p>}
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowUpload(true)}
            style={{
              padding: '10px 20px', background: product.color, color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: `0 4px 14px ${product.color}40`,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Upload Document
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {[{ key: 'all', label: 'All' }, ...Object.entries(TYPE_LABELS).map(([k, v]) => ({ key: k, label: v.label }))].map(f => (
          <button key={f.key} onClick={() => setFilterType(f.key)}
            style={{
              padding: '5px 14px', borderRadius: 6, fontSize: 11.5, fontWeight: 600,
              border: filterType === f.key ? '1.5px solid #2563EB' : '1.5px solid var(--bd)',
              background: filterType === f.key ? 'rgba(37,99,235,.06)' : 'var(--card)',
              color: filterType === f.key ? '#2563EB' : 'var(--t3)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,18,53,.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowUpload(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: '28px 32px', width: 480, boxShadow: '0 20px 60px rgba(15,18,53,.18)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 18px', color: 'var(--t1)' }}>Upload Document</h3>
            {uploadError && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#DC2626', marginBottom: 14 }}>{uploadError}</div>}
            <form onSubmit={handleUpload}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--t1)', marginBottom: 5 }}>Title</label>
              <input value={uploadForm.title} onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })} required
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E6F0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', marginBottom: 14, boxSizing: 'border-box' }} />
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--t1)', marginBottom: 5 }}>Description</label>
              <textarea value={uploadForm.description} onChange={e => setUploadForm({ ...uploadForm, description: e.target.value })} rows={2}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E6F0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', marginBottom: 14, resize: 'vertical', boxSizing: 'border-box' }} />
              
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--t1)', marginBottom: 5 }}>Sprint <span style={{ fontWeight: 400, color: 'var(--t3)' }}>(optional)</span></label>
                  <input value={uploadForm.sprint} onChange={e => setUploadForm({ ...uploadForm, sprint: e.target.value })} placeholder="e.g. Sprint 42"
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E6F0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--t1)', marginBottom: 5 }}>Release <span style={{ fontWeight: 400, color: 'var(--t3)' }}>(optional)</span></label>
                  <input value={uploadForm.release} onChange={e => setUploadForm({ ...uploadForm, release: e.target.value })} placeholder="e.g. v2.1.0"
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E6F0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--t1)', marginBottom: 5 }}>Type</label>
              <select value={uploadForm.artefact_type} onChange={e => setUploadForm({ ...uploadForm, artefact_type: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E6F0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 14 }}>
                <option value="documentation">Documentation</option>
                <option value="release-notes">Release Notes</option>
                <option value="guide">Guide</option>
                <option value="video">Video</option>
                <option value="newsletter">Newsletter</option>
                <option value="api-spec">API Specification</option>
              </select>
              {uploadForm.artefact_type === 'video' && (
                <>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--t1)', marginBottom: 5 }}>Video URL <span style={{ fontWeight: 400, color: 'var(--t3)' }}>(optional — YouTube, Vimeo, Loom, or direct link)</span></label>
                  <input value={uploadForm.video_url} onChange={e => setUploadForm({ ...uploadForm, video_url: e.target.value })} placeholder="https://youtube.com/watch?v=..."
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E6F0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', marginBottom: 14, boxSizing: 'border-box' }} />
                </>
              )}
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--t1)', marginBottom: 5 }}>File <span style={{ fontWeight: 400, color: 'var(--t3)' }}>(optional)</span></label>
              <div style={{
                border: '1.5px dashed #E2E6F0', borderRadius: 8, padding: '20px', textAlign: 'center',
                marginBottom: 18, background: uploadFile ? 'rgba(37,99,235,.03)' : 'transparent',
                cursor: 'pointer',
              }} onClick={() => document.getElementById('file-input')?.click()}>
                <input id="file-input" type="file" style={{ display: 'none' }} onChange={e => setUploadFile(e.target.files?.[0] || null)} />
                {uploadFile ? (
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#2563EB' }}>
                    {uploadFile.name} ({formatSize(uploadFile.size)})
                    <button type="button" onClick={e => { e.stopPropagation(); setUploadFile(null); }} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Remove</button>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--t3)' }}>Click to select a file or drag and drop</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowUpload(false)} style={{ padding: '9px 18px', border: '1.5px solid #E2E6F0', borderRadius: 8, background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--t2)' }}>Cancel</button>
                <button type="submit" disabled={uploading || (!uploadFile && !uploadForm.video_url)} style={{ padding: '9px 22px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: (!uploadFile && !uploadForm.video_url) ? 0.5 : 1 }}>
                  {uploading ? 'Uploading…' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Documents List */}
      {filteredArtefacts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--t3)', background: 'var(--card)', borderRadius: 14, border: '1.5px dashed var(--bd)' }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>No documents found</div>
          {isAdmin && <p style={{ fontSize: 12, marginTop: 6 }}>Upload your first document to this product.</p>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredArtefacts.map(a => {
            const typeInfo = TYPE_LABELS[a.artefact_type] || { label: a.artefact_type, color: '#6B7199' };
            return (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--card)', border: '1.5px solid var(--bd)', borderRadius: 12,
                padding: '14px 20px', transition: 'border-color .15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#C7D2FE')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${typeInfo.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
            );
          })}
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
              // Direct video file URL
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
