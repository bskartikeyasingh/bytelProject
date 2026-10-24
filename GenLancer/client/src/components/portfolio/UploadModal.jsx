import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  UploadCloud, 
  Film, 
  ImageIcon, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  Trash2, 
  Layers,
  Link as LinkIcon,
  FileText
} from 'lucide-react';
import { apiUrl } from '../../lib/apiConfig';
import { getAccessToken } from '../../lib/supabase';
import { validateUrl } from '../../lib/urlValidator';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function UploadModal({
  isOpen,
  onClose,
  editingItem = null,
  currentFreelancerId = null,
  onSaveSuccess
}) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadMode, setUploadMode] = useState('local'); // 'local' | 'url'
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [error, setError] = useState(null);

  // Form fields
  const [formState, setFormState] = useState({
    title: '',
    description: '',
    creatorRole: 'Generative AI Director',
    niche: 'Commercial / Advertising',
    contentType: 'Video',
    aspectRatio: '16:9',
    skillsUsed: 'Prompt Engineering, Upscaling',
    modelUsed: 'Runway Gen-3 Alpha',
    mediaUrl: '',
    projectUrl: '',
    projectOutcome: '',
    pipeline: 'Runway Gen-3 Alpha ➔ Master',
    promptSummary: '',
    seed: ''
  });

  // Sync state on open or edit
  useEffect(() => {
    if (!isOpen) return;

    if (editingItem) {
      setFormState({
        title: editingItem.title || '',
        description: editingItem.description || '',
        creatorRole: editingItem.creator_role || editingItem.creatorRole || 'Generative AI Director',
        niche: editingItem.niche || 'Commercial / Advertising',
        contentType: editingItem.media_type === 'video' || editingItem.contentType === 'Video' ? 'Video' : 'Image',
        aspectRatio: editingItem.aspect_ratio || editingItem.aspectRatio || '16:9',
        skillsUsed: Array.isArray(editingItem.skills_used) ? editingItem.skills_used.join(', ') : (editingItem.skills_used || ''),
        modelUsed: editingItem.model_used || editingItem.modelUsed || editingItem.tool || 'Runway Gen-3 Alpha',
        mediaUrl: editingItem.media_url || editingItem.mediaUrl || '',
        projectUrl: editingItem.project_url || editingItem.projectUrl || '',
        projectOutcome: editingItem.project_outcome || editingItem.projectOutcome || '',
        pipeline: editingItem.pipeline || '',
        promptSummary: editingItem.prompt_summary || editingItem.promptSummary || editingItem.prompt || '',
        seed: editingItem.seed || ''
      });

      if (editingItem.media_url || editingItem.mediaUrl) {
        setPreviewUrl(editingItem.media_url || editingItem.mediaUrl);
        setUploadMode('url');
      }
    } else {
      setFormState({
        title: '',
        description: '',
        creatorRole: 'Generative AI Director',
        niche: 'Commercial / Advertising',
        contentType: 'Video',
        aspectRatio: '16:9',
        skillsUsed: 'Prompt Engineering, Camera Control, 4K Upscaling',
        modelUsed: 'Runway Gen-3 Alpha',
        mediaUrl: '',
        projectUrl: '',
        projectOutcome: '',
        pipeline: 'Runway Gen-3 Alpha ➔ Master',
        promptSummary: '',
        seed: Math.floor(100000000 + Math.random() * 900000000).toString()
      });
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadMode('local');
    }
    setError(null);
  }, [isOpen, editingItem]);

  // Clean up object URLs on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!isOpen) return null;

  // Process chosen file
  const processFile = (file) => {
    setError(null);

    if (!file) return;

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setError('Unsupported file type. Please select an image (PNG, JPG, WebP) or video (MP4, WebM).');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`File size exceeds 50MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a compressed file.`);
      return;
    }

    // Revoke previous blob URL if any
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    // Instant Preview Hook
    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(objectUrl);
    setUploadMode('local');

    // Automatically set contentType and default title if empty
    const isVideo = file.type.startsWith('video/');
    setFormState(prev => ({
      ...prev,
      contentType: isVideo ? 'Video' : 'Image',
      title: prev.title || file.name.replace(/\.[^/.]+$/, "")
    }));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Drag and drop events
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleClearSelectedFile = (e) => {
    e.stopPropagation();
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formState.title || formState.title.trim().length < 3) {
      setError('Project title is required (at least 3 characters).');
      return;
    }

    if (!formState.promptSummary || formState.promptSummary.trim().length === 0) {
      setError('Generation prompt is required to verify AI authorship evidence.');
      return;
    }

    if (uploadMode === 'local' && !selectedFile && !previewUrl) {
      setError('Please select or drop an image or video file from your device.');
      return;
    }

    if (uploadMode === 'url' && !formState.mediaUrl.trim()) {
      setError('Please enter a valid media URL.');
      return;
    }

    setIsUploading(true);
    setUploadProgressText(selectedFile ? 'Uploading asset...' : 'Saving project evidence...');

    try {
      const token = await getAccessToken();
      const activeCreatorId = currentFreelancerId || localStorage.getItem('genlancer_user_id');
      if (!activeCreatorId) {
        throw new Error('Active creator session not found. Please log in.');
      }

      if (selectedFile) {
        // Native local file uploader via FormData
        const formData = new FormData();
        formData.append('mediaFile', selectedFile);
        formData.append('title', formState.title.trim());
        formData.append('modelUsed', formState.modelUsed.trim());
        formData.append('promptSummary', formState.promptSummary.trim());
        formData.append('description', formState.description.trim());
        formData.append('creatorRole', formState.creatorRole.trim());
        formData.append('niche', formState.niche.trim());
        formData.append('aspectRatio', formState.aspectRatio);
        formData.append('creatorId', activeCreatorId);
        formData.append('pipeline', formState.pipeline || `${formState.modelUsed} ➔ Master`);
        formData.append('seed', formState.seed || Math.floor(100000000 + Math.random() * 900000000).toString());

        const headers = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const uploadEndpoint = apiUrl('/api/creators/portfolio/upload');
        const res = await fetch(uploadEndpoint, {
          method: 'POST',
          headers,
          body: formData
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || data.error || 'File upload failed.');
        }

        if (onSaveSuccess) {
          onSaveSuccess(data.item, Boolean(editingItem));
        }
      } else {
        // Fallback for URL or editing existing item without changing file
        const skillsArray = formState.skillsUsed
          ? (typeof formState.skillsUsed === 'string'
              ? formState.skillsUsed.split(',').map(s => s.trim()).filter(Boolean)
              : formState.skillsUsed)
          : ['Prompt Engineering'];

        const toolsArray = formState.modelUsed
          ? [formState.modelUsed]
          : ['Runway Gen-3 Alpha'];

        const payload = {
          title: formState.title.trim(),
          description: formState.description.trim(),
          creator_role: formState.creatorRole.trim(),
          skills_used: skillsArray,
          tools_used: toolsArray,
          content_type: formState.contentType,
          niche: formState.niche,
          media_url: formState.mediaUrl.trim() || previewUrl,
          mediaUrl: formState.mediaUrl.trim() || previewUrl,
          project_url: formState.projectUrl.trim() || null,
          project_outcome: formState.projectOutcome ? formState.projectOutcome.trim() : null,
          pipeline: formState.pipeline || `${formState.modelUsed} ➔ Master`,
          aspect_ratio: formState.aspectRatio,
          prompt: formState.promptSummary.trim(),
          prompt_summary: formState.promptSummary.trim(),
          model_used: formState.modelUsed.trim(),
          seed: formState.seed ? formState.seed.trim() : Math.floor(100000000 + Math.random() * 900000000).toString()
        };

        const targetUrl = editingItem
          ? apiUrl(`/api/creators/${activeCreatorId}/portfolio/${editingItem.id}`)
          : apiUrl(`/api/creators/${activeCreatorId}/portfolio`);

        const res = await fetch(targetUrl, {
          method: editingItem ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || data.message || 'Failed to save portfolio project.');
        }
        const savedItem = data.item || { ...payload, id: editingItem?.id || `pf-${Date.now()}` };

        if (onSaveSuccess) {
          onSaveSuccess(savedItem, Boolean(editingItem));
        }
      }

      onClose();
    } catch (err) {
      console.error('Portfolio save error:', err);
      setError(err.message || 'Failed to save portfolio project.');
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
    }
  };

  const isVideoPreview = selectedFile
    ? selectedFile.type.startsWith('video')
    : (formState.contentType === 'Video' || (previewUrl && previewUrl.match(/\.(mp4|webm|mov)$/i)));

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-label={editingItem ? 'Edit Portfolio Project' : 'Add Project to Portfolio'}
        className="bg-zinc-950 text-zinc-100 rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-zinc-800 shadow-2xl relative my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-200 cursor-pointer p-1.5 rounded-xl hover:bg-zinc-800/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-1.5">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              {editingItem ? 'Edit Portfolio Project' : 'Add Project to Portfolio'}
            </h3>
          </div>
        </div>

        <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
          Upload native generative media directly from your device with instant zero-black-screen preview and prompt workflow metadata.
        </p>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-200 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Upload Mode Selector (Local Native Uploader vs Direct Media Link) */}
        <div className="flex items-center gap-2 p-1 bg-zinc-900/80 rounded-xl mb-4 border border-zinc-800">
          <button
            type="button"
            onClick={() => setUploadMode('local')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              uploadMode === 'local'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload From Device</span>
          </button>
          <button
            type="button"
            onClick={() => setUploadMode('url')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              uploadMode === 'url'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Media URL Link</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Native Local File Uploader Dropzone */}
          {uploadMode === 'local' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                <span>Select Asset File <span className="text-violet-400">*</span></span>
                {selectedFile && (
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type || 'media'}
                  </span>
                )}
              </label>

              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition relative group ${
                  isDragging 
                    ? 'border-violet-500 bg-violet-950/20 scale-[0.99]' 
                    : 'border-zinc-700 hover:border-violet-500 bg-zinc-900/50 hover:bg-zinc-900'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  accept="image/png,image/jpeg,image/webp,video/mp4,video/webm" 
                  className="hidden" 
                />

                {previewUrl ? (
                  <div className="relative group/preview">
                    {isVideoPreview ? (
                      <video 
                        src={previewUrl} 
                        controls 
                        playsInline
                        preload="metadata"
                        className="max-h-56 mx-auto rounded-lg object-cover shadow-lg border border-zinc-700" 
                      />
                    ) : (
                      <img 
                        src={previewUrl} 
                        alt="Preview" 
                        className="max-h-56 mx-auto rounded-lg object-cover shadow-lg border border-zinc-700" 
                      />
                    )}

                    <div className="mt-3 flex items-center justify-center gap-2">
                      <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Instant preview active (Zero black screens)
                      </span>
                      <button
                        type="button"
                        onClick={handleClearSelectedFile}
                        className="text-xs text-zinc-400 hover:text-rose-400 ml-2 px-2 py-0.5 rounded-md hover:bg-zinc-800 transition flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Change
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-zinc-400 py-2">
                    <span className="text-3xl">📁</span>
                    <p className="text-sm font-medium text-zinc-200">Click or drag & drop files from your device</p>
                    <p className="text-xs text-zinc-500">Supports MP4, WebM, PNG, JPG, WebP (Max 50MB)</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Media URL Input Option */}
          {uploadMode === 'url' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                <span>Direct Media Asset URL <span className="text-violet-400">*</span></span>
              </label>
              <input 
                type="url"
                placeholder="https://assets.mixkit.co/.../video.mp4 or .png"
                value={formState.mediaUrl}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormState(prev => ({ ...prev, mediaUrl: val }));
                  if (val.trim()) {
                    setPreviewUrl(val);
                  } else {
                    setPreviewUrl(null);
                  }
                }}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 outline-none focus:border-violet-500 transition font-mono"
              />
              {previewUrl && (
                <div className="mt-3 p-2 bg-zinc-900/60 rounded-xl border border-zinc-800">
                  {isVideoPreview ? (
                    <video src={previewUrl} controls className="max-h-48 mx-auto rounded-lg object-cover" />
                  ) : (
                    <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto rounded-lg object-cover" />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Project Title */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Project Title <span className="text-rose-400">*</span>
            </label>
            <input 
              type="text"
              placeholder="e.g. Neon Monolith - Cyberpunk Commercial"
              value={formState.title}
              onChange={(e) => setFormState(prev => ({ ...prev, title: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 outline-none focus:border-violet-500 transition"
              required
            />
          </div>

          {/* AI Tools & Models Used & Aspect Ratio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                AI Tool / Model Used <span className="text-rose-400">*</span>
              </label>
              <input 
                type="text"
                placeholder="e.g. Runway Gen-3 Alpha, Midjourney v6"
                value={formState.modelUsed}
                onChange={(e) => setFormState(prev => ({ ...prev, modelUsed: e.target.value }))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 outline-none focus:border-violet-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Aspect Ratio
              </label>
              <select
                value={formState.aspectRatio}
                onChange={(e) => setFormState(prev => ({ ...prev, aspectRatio: e.target.value }))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 outline-none focus:border-violet-500 transition cursor-pointer"
              >
                <option value="16:9">16:9 (Cinematic)</option>
                <option value="9:16">9:16 (Vertical Reel)</option>
                <option value="1:1">1:1 (Square)</option>
                <option value="4:5">4:5 (Portrait)</option>
              </select>
            </div>
          </div>

          {/* Exact Generation Prompt / Summary */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Exact Generation Prompt / Summary <span className="text-rose-400">*</span>
            </label>
            <textarea 
              rows={2}
              placeholder="Paste the generative prompt, negative prompts, camera motion tokens, or workflow summary..."
              value={formState.promptSummary}
              onChange={(e) => setFormState(prev => ({ ...prev, promptSummary: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 outline-none focus:border-violet-500 transition font-mono resize-none"
              required
            />
          </div>

          {/* Project Description (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Project Description (Optional)
            </label>
            <textarea 
              rows={2}
              placeholder="Context on the creative direction, aesthetic goals, or commercial client deliverable..."
              value={formState.description}
              onChange={(e) => setFormState(prev => ({ ...prev, description: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 outline-none focus:border-violet-500 transition resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex gap-2.5">
            <button
              type="submit"
              disabled={isUploading}
              className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{uploadProgressText || 'Uploading asset...'}</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>{editingItem ? 'Save Changes' : 'Upload Project Evidence'}</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold rounded-xl text-xs transition-all cursor-pointer border border-zinc-800"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
