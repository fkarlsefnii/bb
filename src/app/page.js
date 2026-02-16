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
  const handleNavigate = (file) => {
    if (file.type === 'folder') {
      loadFiles(file.path);
    }
  };

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

  if (!config) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://i.postimg.cc/g0M89Nv2/Banner.png')] bg-cover bg-center opacity-20 blur-sm" />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-netflix-blue-100 border-t-transparent rounded-full animate-spin" />
        <p className="text-netflix-blue-100 font-mono animate-pulse">Sistem yüklənir...</p>
      </div>
    </div>
  );

  return (
    <div
      {...getRootProps()}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDropToFolder(e, null)}
      className="flex flex-col h-screen bg-black text-white overflow-hidden font-sans relative selection:bg-netflix-blue selection:text-white"
    >
      <input {...getInputProps()} />

      {/* Background Effects */}
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute inset-0 bg-center bg-cover bg-no-repeat opacity-40 scale-105 blur-md"
          style={{ backgroundImage: "url('https://i.postimg.cc/g0M89Nv2/Banner.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />

        {/* Atmospheric Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-1/2 h-1/2 bg-green-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-1/2 h-1/2 bg-netflix-blue-100/10 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="h-20 border-b border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-between px-8 z-10 shrink-0 shadow-2xl relative">
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent pointer-events-none" />

        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3 bg-gradient-to-br from-netflix-blue-100 to-blue-600 rounded-2xl shadow-lg shadow-netflix-blue-100/20 group hover:scale-105 transition-transform duration-300">
            <Folder className="text-white" size={24} fill="currentColor" fillOpacity={0.2} />
          </div>
          <div>
            <h1 className="font-black text-2xl tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent drop-shadow-sm">
              B2 Manager
            </h1>
            <div className="text-[10px] text-netflix-blue-100 font-mono uppercase tracking-[0.2em] opacity-80">
              {config.bucketName}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <Link href="/upload-episode" className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-white/5 hover:border-white/20 group">
            <Film size={16} className="text-netflix-blue-100 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Ep Upload</span>
          </Link>

          <div className="h-8 w-px bg-white/10 mx-2" />

          <button onClick={handleTestConnection} className="p-3 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all border border-transparent hover:border-white/5 group">
            {testStatus === 'success' ?
              <Wifi className="text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" size={20} /> :
              <Wifi size={20} className="group-hover:text-netflix-blue-100 transition-colors" />
            }
          </button>

          <button onClick={handleConfigureCors} className="p-3 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all border border-transparent hover:border-white/5 group">
            <Settings size={20} className={`group-hover:text-netflix-blue-100 transition-colors ${corsStatus === 'configuring' ? 'animate-spin text-netflix-blue-100' : ''}`} />
          </button>

          <button onClick={handleCreateFolder} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white border border-white/5 hover:border-white/20 transition-all group ml-2">
            <Plus size={20} className="group-hover:rotate-90 transition-transform text-netflix-blue-100" />
          </button>

          <button
            onClick={() => document.getElementById('file-upload').click()}
            className="flex items-center gap-2 px-6 py-3 bg-netflix-blue-100 hover:bg-cyan-400 text-black hover:text-black rounded-xl text-sm font-black transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] hover:-translate-y-0.5"
          >
            <Upload size={18} strokeWidth={2.5} />
            Yüklə
          </button>
          <input id="file-upload" type="file" multiple className="hidden" onChange={(e) => handleFileSelection(e.target.files)} />
        </div>
      </header>

      {/* Breadcrumbs */}
      <div className="h-12 border-b border-white/5 bg-black/40 backdrop-blur-sm flex items-center px-8 text-xs font-mono shrink-0 relative z-10 overflow-x-auto">
        <button
          onClick={() => loadFiles('')}
          className="flex items-center gap-2 text-netflix-blue-100 hover:text-white transition-colors uppercase tracking-wider font-bold px-2 py-1 rounded hover:bg-white/5"
        >
          <Folder size={14} />
          root
        </button>
        {path.split('/').filter(Boolean).map((part, i, arr) => {
          const currentPath = arr.slice(0, i + 1).join('/') + '/';
          return (
            <div key={currentPath} className="flex items-center group">
              <ChevronRight size={12} className="mx-2 text-gray-600" />
              <button
                onClick={() => loadFiles(currentPath)}
                className="hover:text-netflix-blue-100 text-gray-400 transition-colors px-2 py-1 rounded hover:bg-white/5"
              >
                {part}
              </button>
            </div>
          );
        })}
      </div>

      {/* File Area */}
      <div className="flex-1 overflow-y-auto p-8 relative z-10 custom-scrollbar">
        {isDragActive && (
          <div className="absolute inset-4 z-50 bg-black/60 backdrop-blur-md border-2 border-netflix-blue-100 border-dashed rounded-3xl flex items-center justify-center pointer-events-none animate-pulse">
            <div className="text-2xl font-black text-netflix-blue-100 flex flex-col items-center gap-4 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
              <Upload size={64} />
              Faylları bura buraxın
            </div>
          </div>
        )}

        {files.length === 0 && !loading ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-6">
            <div className="p-6 rounded-full bg-white/5 border border-white/5 ring-1 ring-white/10">
              <Folder size={64} strokeWidth={0.5} className="text-gray-600" />
            </div>
            <p className="text-sm font-medium tracking-wide">Bu qovluq boşdur</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {path && (
              <button
                onClick={goBack}
                className="group aspect-square bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95"
              >
                <div className="p-3 rounded-xl bg-white/5 text-gray-400 group-hover:text-white transition-colors">
                  <RotateCcw size={24} />
                </div>
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider group-hover:text-gray-300">Geri</span>
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
                    "group relative aspect-square bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center justify-center p-4 gap-3 cursor-pointer transition-all duration-300 overflow-hidden",
                    "hover:border-netflix-blue-100/30 hover:shadow-lg hover:shadow-netflix-blue-100/5 hover:-translate-y-1",
                    draggedItem?.path === file.path && "opacity-50 grayscale"
                  )}
                >
                  {/* Hover Gradient Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-netflix-blue-100/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                  <div className={clsx(
                    "p-4 rounded-[1.2rem] transition-transform duration-300 group-hover:scale-110 shadow-xl",
                    file.type === 'folder' ? "bg-amber-500/10 shadow-amber-500/5" : "bg-netflix-blue-100/10 shadow-netflix-blue-100/5"
                  )}>
                    {file.type === 'folder' ? (
                      <Folder className="text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]" size={36} fill="currentColor" fillOpacity={0.2} />
                    ) : (
                      <FileIcon className="text-netflix-blue-100 drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]" size={36} />
                    )}
                  </div>

                  <div className="text-center w-full px-2 relative z-10">
                    <div className="text-[11px] font-bold truncate text-gray-200 group-hover:text-white transition-colors" title={file.name}>
                      {file.name}
                    </div>
                    {file.type === 'file' && (
                      <div className="text-[9px] text-gray-500 mt-1 font-mono uppercase tracking-tighter group-hover:text-netflix-blue-100 transition-colors">
                        {formatBytes(file.size)}
                      </div>
                    )}
                  </div>

                  {/* Quick Toolbox */}
                  <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 z-20">
                    {file.type === 'file' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); copyLink(file); }}
                        className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-netflix-blue-100 hover:bg-netflix-blue-100 hover:text-black transition-all border border-white/10 hover:border-netflix-blue-100 shadow-lg"
                        title="Linki kopyala"
                      >
                        {copiedPath === file.path ? <Check size={14} strokeWidth={3} /> : <LinkIcon size={14} />}
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(file); }}
                      className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-red-500 hover:bg-red-500 hover:text-white transition-all border border-white/10 hover:border-red-500 shadow-lg"
                      title="Sil"
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-black/80 border border-white/10 p-8 rounded-[2rem] shadow-2xl w-full max-w-md relative overflow-hidden"
            >
              {/* Modal Background Glow */}
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-netflix-blue-100/20 rounded-full blur-[80px] pointer-events-none" />

              <div className="relative z-10">
                <div className="w-16 h-16 bg-gradient-to-br from-netflix-blue-100/20 to-blue-600/20 rounded-2xl flex items-center justify-center mb-6 mx-auto border border-white/5 ring-1 ring-white/10 shadow-xl shadow-netflix-blue-100/10">
                  <Upload className="text-netflix-blue-100" size={32} />
                </div>
                <h2 className="text-2xl font-black text-center mb-2 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">Yükləməni Təsdiqlə</h2>
                <p className="text-gray-400 text-sm text-center mb-8">
                  Fayllar <span className="text-netflix-blue-100 font-mono px-1 py-0.5 bg-netflix-blue-100/10 rounded">root/{path}</span> qovluğuna yüklənəcək.
                </p>

                <div className="max-h-48 overflow-y-auto space-y-2 mb-8 pr-2 custom-scrollbar">
                  {uploadQueue.map((f, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5 text-[11px] group hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-white/5 rounded-lg text-netflix-blue-100">
                          <FileIcon size={14} />
                        </div>
                        <span className="truncate font-bold text-gray-200">{f.name}</span>
                      </div>
                      <span className="text-gray-500 font-mono">{formatBytes(f.size)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="flex-1 px-6 py-3.5 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-all text-gray-300 hover:text-white border border-white/5"
                  >
                    Ləğv et
                  </button>
                  <button
                    onClick={startQueueUpload}
                    className="flex-1 px-6 py-3.5 bg-netflix-blue-100 hover:bg-cyan-400 text-black rounded-xl font-bold shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all transform hover:-translate-y-0.5"
                  >
                    Başlat
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Progress Bars */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-[60]">
        <AnimatePresence>
          {Object.entries(uploadProgress).map(([name, progress]) => (
            <motion.div
              layout
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
              key={name}
              className="bg-black/80 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-2xl w-80 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-netflix-blue-100/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="flex justify-between items-center mb-3 relative z-10">
                <span className="text-[11px] font-bold truncate max-w-[180px] text-gray-300">{name}</span>
                <span className="text-netflix-blue-100 font-mono font-black text-xs drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]">{progress}%</span>
              </div>

              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden relative z-10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-gradient-to-r from-blue-600 via-netflix-blue-100 to-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
