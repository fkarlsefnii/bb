'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Folder,
  File as FileIcon,
  Upload,
  Trash2,
  RotateCcw,
  Plus,
  AlertCircle,
  Wifi,
  WifiOff,
  Settings,
  Link as LinkIcon,
  Copy,
  ExternalLink,
  ChevronRight,
  MoreVertical,
  Check,
  Film
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { formatBytes } from '@/lib/utils';
import {
  listFiles,
  createFolder,
  deleteItem,
  getUploadUrl,
  checkConfig,
  testB2Connection,
  configureCors,
  uploadFileAction,
  moveItem
} from '@/app/actions';

export default function B2Manager() {
  const [config, setConfig] = useState(null);
  const [path, setPath] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [testStatus, setTestStatus] = useState(null);
  const [corsStatus, setCorsStatus] = useState(null);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [copiedPath, setCopiedPath] = useState(null);

  // Initial load
  useEffect(() => {
    checkConfig().then(c => {
      setConfig(c);
      if (c.configured) loadFiles('');
    });
  }, []);

  const loadFiles = useCallback(async (currentPath) => {
    setLoading(true);
    // Path həmişə düzgün slash ilə bitməlidir (root istisna)
    const normalizedPath = currentPath && !currentPath.endsWith('/') ? currentPath + '/' : currentPath;
    const res = await listFiles(normalizedPath);
    if (res.success) {
      setFiles(res.data);
      setPath(normalizedPath);
    }
    setLoading(false);
  }, []);

  const handleTestConnection = async () => {
    setTestStatus('testing');
    const result = await testB2Connection();
    setTestStatus(result.success ? 'success' : 'error');
    setTimeout(() => setTestStatus(null), 3000);
  };

  const handleConfigureCors = async () => {
    if (!confirm("CORS qaydaları yenilənsin?")) return;
    setCorsStatus('configuring');
    const result = await configureCors();
    setCorsStatus(result.success ? 'success' : 'error');
    if (result.success) alert("Uğurla tənzimləndi!");
    setTimeout(() => setCorsStatus(null), 3000);
  };

  const copyLink = (file) => {
    // B2 Public Link formatı
    const endpoint = config.endpoint || 's3.eu-central-003.backblazeb2.com';
    const cleanEndpoint = endpoint.replace('https://', '').replace('http://', '');
    const url = `https://${config.bucketName}.${cleanEndpoint}/${file.path}`;

    navigator.clipboard.writeText(url);
    setCopiedPath(file.path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  // Drag and Drop (Daxili hərəkət)
  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropToFolder = async (e, targetItem) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem) return;

    // Əgər hədəf qovluqdursa, onun içinə at, deyilsə mövcud path-ə at
    let targetPath = path;
    if (targetItem && targetItem.type === 'folder') {
      targetPath = targetItem.path;
    }

    if (draggedItem.path === targetPath + draggedItem.name) return;

    const newKey = targetPath + draggedItem.name;

    setLoading(true);
    const result = await moveItem(draggedItem.path, newKey);
    if (result.success) {
      loadFiles(path);
    } else {
      alert("Xəta: " + result.error);
    }
    setLoading(false);
    setDraggedItem(null);
  };

  const handleFileSelection = (fileList) => {
    setUploadQueue(Array.from(fileList));
    setShowUploadModal(true);
  };

  const startQueueUpload = async () => {
    setShowUploadModal(false);

    for (const file of uploadQueue) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', path);

      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(prev => ({ ...prev, [file.name]: percent }));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadProgress(prev => {
            const newP = { ...prev };
            delete newP[file.name];
            return newP;
          });
          loadFiles(path);
        } else {
          alert(`Xəta (${file.name}): ${xhr.statusText}`);
        }
      };

      xhr.open('POST', '/api/upload');
      xhr.send(formData);
    }
    setUploadQueue([]);
  };

  const onDropZone = useCallback(acceptedFiles => {
    handleFileSelection(acceptedFiles);
  }, [path]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop: onDropZone, noClick: true });

  const handleDelete = async (item) => {
    if (!confirm(`${item.name} silinsin?`)) return;
    await deleteItem(item.path, item.type);
    loadFiles(path);
  };

  const handleCreateFolder = async () => {
    const name = prompt("Qovluq adı:");
    if (!name) return;
    const folderPath = path + name + '/';
    await createFolder(folderPath);
    loadFiles(path);
  };

  const goBack = () => {
    const parts = path.split('/').filter(Boolean);
    parts.pop();
    const newPath = parts.length > 0 ? parts.join('/') + '/' : '';
    loadFiles(newPath);
  };

  if (!config) return <div className="p-10 text-slate-400 animate-pulse">Yüklənir...</div>;

  return (
    <div
      {...getRootProps()}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDropToFolder(e, null)}
      className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans"
    >
      <input {...getInputProps()} />

      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex items-center justify-between px-6 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-lg">
            <Folder className="text-white" size={20} />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">B2 Manager</h1>
            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{config.bucketName}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/upload-episode" className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all border border-slate-700/50">
            <Film size={14} /> Ep Upload
          </Link>
          <button onClick={handleTestConnection} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
            {testStatus === 'success' ? <Wifi className="text-green-500" size={20} /> : <Wifi size={20} />}
          </button>
          <button onClick={handleConfigureCors} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
            <Settings size={20} className={corsStatus === 'configuring' ? 'animate-spin' : ''} />
          </button>

          <div className="h-6 w-px bg-slate-800 mx-1" />

          <button
            onClick={() => document.getElementById('file-upload').click()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-all"
          >
            <Upload size={16} /> Yüklə
          </button>
          <input id="file-upload" type="file" multiple className="hidden" onChange={(e) => handleFileSelection(e.target.files)} />

          <button onClick={handleCreateFolder} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white">
            <Plus size={20} />
          </button>
        </div>
      </header>

      {/* Breadcrumbs */}
      <div className="h-10 border-b border-slate-800/50 bg-slate-950/50 flex items-center px-6 text-xs text-slate-500 font-mono shrink-0">
        <button onClick={() => loadFiles('')} className="hover:text-blue-400 uppercase tracking-tighter">root</button>
        {path.split('/').filter(Boolean).map((part, i, arr) => {
          const currentPath = arr.slice(0, i + 1).join('/') + '/';
          return (
            <div key={currentPath} className="flex items-center">
              <ChevronRight size={12} className="mx-1 text-slate-700" />
              <button onClick={() => loadFiles(currentPath)} className="hover:text-blue-400">{part}</button>
            </div>
          );
        })}
      </div>

      {/* File Area */}
      <div className="flex-1 overflow-y-auto p-6 relative bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900/20 via-transparent to-transparent">
        {isDragActive && (
          <div className="absolute inset-4 z-50 bg-blue-600/10 backdrop-blur-sm border-2 border-blue-500 border-dashed rounded-2xl flex items-center justify-center pointer-events-none">
            <div className="text-xl font-bold text-blue-400 flex flex-col items-center gap-2">
              <Upload size={48} />
              Faylları bura buraxın
            </div>
          </div>
        )}

        {files.length === 0 && !loading ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-700 gap-4">
            <Folder size={80} strokeWidth={0.5} />
            <p className="text-sm font-medium">Bu qovluq boşdur</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {path && (
              <button
                onClick={goBack}
                className="aspect-square bg-slate-900/30 hover:bg-slate-800/50 border border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all"
              >
                <RotateCcw size={24} className="text-slate-600" />
                <span className="text-[10px] text-slate-600 uppercase font-bold">Geri</span>
              </button>
            )}

            <AnimatePresence mode="popLayout">
              {files.map((file) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={file.path}
                  draggable
                  onDragStart={(e) => handleDragStart(e, file)}
                  onDragOver={file.type === 'folder' ? handleDragOver : undefined}
                  onDrop={file.type === 'folder' ? (e) => handleDropToFolder(e, file) : undefined}
                  onDoubleClick={() => handleNavigate(file)}
                  className={clsx(
                    "group relative aspect-square bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center justify-center p-4 gap-3 cursor-pointer transition-all hover:border-slate-600 hover:shadow-2xl hover:bg-slate-800/50",
                    draggedItem?.path === file.path && "opacity-50 grayscale"
                  )}
                >
                  <div className={clsx(
                    "p-4 rounded-3xl transition-transform group-hover:scale-110",
                    file.type === 'folder' ? "bg-amber-500/10" : "bg-blue-500/10"
                  )}>
                    {file.type === 'folder' ? (
                      <Folder className="text-amber-500" size={32} fill="currentColor" fillOpacity={0.2} />
                    ) : (
                      <FileIcon className="text-blue-400" size={32} />
                    )}
                  </div>

                  <div className="text-center w-full px-2">
                    <div className="text-[11px] font-bold truncate text-slate-300" title={file.name}>
                      {file.name}
                    </div>
                    {file.type === 'file' && (
                      <div className="text-[9px] text-slate-600 mt-1 font-mono uppercase tracking-tighter">
                        {formatBytes(file.size)}
                      </div>
                    )}
                  </div>

                  {/* Quick Toolbox */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                    {file.type === 'file' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); copyLink(file); }}
                        className="p-1.5 rounded-lg bg-slate-950/80 text-blue-400 hover:bg-blue-600 hover:text-white transition-all border border-slate-800"
                      >
                        {copiedPath === file.path ? <Check size={14} /> : <LinkIcon size={14} />}
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(file); }}
                      className="p-1.5 rounded-lg bg-slate-950/80 text-red-500 hover:bg-red-600 hover:text-white transition-all border border-slate-800"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-md"
            >
              <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Upload className="text-blue-400" size={32} />
              </div>
              <h2 className="text-2xl font-black text-center mb-2">Yükləməni Başlat</h2>
              <p className="text-slate-500 text-sm text-center mb-8">
                Fayllar <span className="text-blue-400 font-mono">root/{path}</span> qovluğuna yüklənəcək.
              </p>

              <div className="max-h-40 overflow-y-auto space-y-2 mb-8 pr-2 custom-scrollbar">
                {uploadQueue.map((f, i) => (
                  <div key={i} className="flex justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px]">
                    <span className="truncate font-bold text-slate-300">{f.name}</span>
                    <span className="text-slate-600">{formatBytes(f.size)}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button onClick={() => setShowUploadModal(false)} className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold transition-all">Ləğv et</button>
                <button onClick={startQueueUpload} className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold shadow-xl shadow-blue-500/20 transition-all">Başlat</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Progress Bars */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-50">
        <AnimatePresence>
          {Object.entries(uploadProgress).map(([name, progress]) => (
            <motion.div
              layout
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.5 }}
              key={name}
              className="bg-slate-900/90 backdrop-blur border border-slate-800 p-5 rounded-2xl shadow-2xl w-80 ring-1 ring-white/5"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-[11px] font-black truncate max-w-[170px] uppercase text-slate-400">{name}</span>
                <span className="text-blue-400 font-mono font-black text-xs">{progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
