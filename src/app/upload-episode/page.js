'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, ArrowLeft, Upload, Check, AlertCircle, Film, FileVideo, X, Play, Clock } from 'lucide-react';
import { searchAnimeInDB } from '@/app/actions';
import { formatBytes } from '@/lib/utils';
import { useDropzone } from 'react-dropzone';

export default function UploadEpisodePage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedAnime, setSelectedAnime] = useState(null);
    const [isSearching, setIsSearching] = useState(false);

    // Global Upload Settings
    const [sourceName, setSourceName] = useState('Tengoku');
    const [sourceType, setSourceType] = useState('sub');
    const [timings, setTimings] = useState({
        openingStart: '', openingEnd: '', endingStart: '', endingEnd: ''
    });

    // Upload Queue State
    const [uploadQueue, setUploadQueue] = useState([]); // Array of { id, file, episodeNumber, progress, status, message }
    const [isUploading, setIsUploading] = useState(false);

    // Debounced Search
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.length < 2) {
                setSearchResults([]);
                return;
            }
            setIsSearching(true);
            try {
                const res = await searchAnimeInDB(searchQuery);
                if (res.success) {
                    setSearchResults(res.data);
                }
            } catch (error) {
                console.error("Search failed", error);
            } finally {
                setIsSearching(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const handleSelectAnime = (anime) => {
        setSelectedAnime(anime);
        setSearchQuery('');
        setSearchResults([]);
    };

    const clearSelectedAnime = () => {
        setSelectedAnime(null);
        setUploadQueue([]);
        setIsUploading(false);
    };

    // Helper to extract episode number from filename
    const extractEpisodeNumber = (filename) => {
        // Look for typical patterns: " - 01 ", "Ep 1", "E1", etc.
        // Or just the last number in the string
        const match = filename.match(/(?:ep|episode|e|\s|^)(\d+)(?:v\d)?(?:[\s.]|$)/i);
        if (match && match[1]) {
            return match[1];
        }
        // Fallback: try to find any number
        const numbers = filename.match(/\d+/g);
        if (numbers && numbers.length > 0) {
            // Usually the episode number is towards the end or is the most significant standalone number
            // Heuristic: valid episode numbers are often 1-4 digits. 1080 (resolution) or 2024 (year) might be false positives.
            // Let's filter out 19xx/20xx or 720/1080 if mixed with smaller numbers.
            const candidates = numbers.filter(n => {
                const num = parseInt(n);
                return num < 1900 && num !== 1080 && num !== 720 && num !== 480;
            });
            if (candidates.length > 0) return candidates[candidates.length - 1]; // Take the last valid looking number
        }
        return '';
    };

    const onDrop = useCallback(acceptedFiles => {
        if (acceptedFiles?.length) {
            const newFiles = acceptedFiles.map(file => ({
                id: Math.random().toString(36).substr(2, 9),
                file,
                episodeNumber: extractEpisodeNumber(file.name),
                progress: 0,
                status: 'pending', // pending, uploading, success, error
                message: ''
            }));
            setUploadQueue(prev => [...prev, ...newFiles]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'video/*': [] },
        multiple: true
    });

    const removeFile = (id) => {
        setUploadQueue(prev => prev.filter(item => item.id !== id));
    };

    const updateEpisodeNumber = (id, num) => {
        setUploadQueue(prev => prev.map(item => item.id === id ? { ...item, episodeNumber: num } : item));
    };

    const processQueue = async () => {
        if (!selectedAnime || isUploading) return;

        setIsUploading(true);

        const pendingUploads = uploadQueue.filter(item => item.status === 'pending');

        // We handle uploads sequentially to avoid browser limits and network saturation
        for (const item of pendingUploads) {
            if (!item.episodeNumber) {
                setUploadQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'error', message: 'Missing Episode Number' } : q));
                continue;
            }

            // Set status to uploading
            setUploadQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'uploading' } : q));

            try {
                const formData = new FormData();
                const fileExtension = item.file.name.split('.').pop();
                const newFileName = `${item.episodeNumber}.${fileExtension}`;
                const finalPath = `${selectedAnime.name}/`;

                const renamedFile = new File([item.file], newFileName, { type: item.file.type });

                formData.append('file', renamedFile);
                formData.append('path', finalPath);
                formData.append('animeId', selectedAnime.id);
                formData.append('episodeNumber', item.episodeNumber);
                formData.append('sourceName', sourceName);
                formData.append('sourceType', sourceType);

                // Timings
                formData.append('openingStart', timings.openingStart);
                formData.append('openingEnd', timings.openingEnd);
                formData.append('endingStart', timings.endingStart);
                formData.append('endingEnd', timings.endingEnd);

                await new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    let lastTime = Date.now();
                    let lastLoaded = 0;

                    xhr.upload.onprogress = (event) => {
                        if (event.lengthComputable) {
                            const now = Date.now();
                            const diffTime = (now - lastTime) / 1000; // seconds

                            // Update speed every ~500ms to avoid jitter and excessive renders
                            // Also update at the very end (100%) to ensure completion state
                            if (diffTime >= 0.5 || event.loaded === event.total) {
                                const diffLoaded = event.loaded - lastLoaded;
                                const speedBytesPerSec = diffTime > 0 ? diffLoaded / diffTime : 0;

                                const percent = Math.round((event.loaded / event.total) * 100);

                                setUploadQueue(prev => prev.map(q => q.id === item.id ? {
                                    ...q,
                                    progress: percent,
                                    loaded: event.loaded,
                                    total: event.total,
                                    speed: speedBytesPerSec
                                } : q));

                                lastTime = now;
                                lastLoaded = event.loaded;
                            }
                        }
                    };

                    xhr.onload = () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            resolve();
                        } else {
                            reject(new Error(xhr.statusText));
                        }
                    };

                    xhr.onerror = () => reject(new Error('Network Error'));

                    xhr.open('POST', '/api/upload');
                    xhr.send(formData);
                });

                // Success
                setUploadQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'success', progress: 100, speed: 0 } : q));

            } catch (error) {
                console.error("Upload error", error);
                setUploadQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'error', message: error.message } : q));
            }
        }

        setIsUploading(false);
    };

    return (
        <div className="min-h-screen bg-netflix-dark text-white font-sans overflow-y-auto selection:bg-netflix-blue-100 selection:text-black pb-32">
            {/* Background */}
            <div className="fixed inset-0 z-0">
                <div className="absolute inset-0 bg-cover bg-center opacity-30 blur-sm scale-105"
                    style={{ backgroundImage: "url('https://wallpapers.com/images/hd/dark-anime-scenery-ua5t5966y2472913.jpg')" }}>
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/90"></div>
            </div>

            {/* Content */}
            <div className="relative z-10 container mx-auto px-4 py-8 flex flex-col items-center min-h-[calc(100vh-4rem)] rounded-none">

                {/* Header */}
                <header className="w-full max-w-4xl flex items-center justify-between mb-12">
                    <Link href="/" className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all border border-white/5 backdrop-blur-md">
                        <ArrowLeft size={18} />
                        <span className="text-sm font-medium">Back to Manager</span>
                    </Link>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                        Upload Episode
                    </h1>
                </header>

                <main className="w-full max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-700 relative">
                    {/* Glass Background & Glow Effects (Clipped) */}
                    <div className="absolute inset-0 rounded-3xl overflow-hidden border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl pointer-events-none z-0">
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-netflix-blue-100/10 rounded-full blur-3xl"></div>
                        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
                    </div>

                    {/* Main Content (Visible/Overflowing for Dropdowns) */}
                    <div className="relative z-10 p-8">
                        <div className="text-center mb-8 relative">
                            <h2 className="text-xl font-bold text-white mb-2">New Episode Upload</h2>
                            <p className="text-white/50 text-sm">Select an anime from Database and upload one or multiple video files.</p>
                        </div>

                        {/* Search / Select Anime */}
                        <div className="space-y-6 relative z-10">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider pl-1">Target Anime (MongoDB)</label>
                                {!selectedAnime ? (
                                    <div className="relative group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-netflix-blue-100 transition-colors" size={18} />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search anime database..."
                                            className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:border-netflix-blue-100/50 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-netflix-blue-100/50 transition-all font-medium"
                                        />
                                        {isSearching && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                <Loader2 className="animate-spin text-netflix-blue-100" size={18} />
                                            </div>
                                        )}

                                        {/* Dropdown Results */}
                                        <AnimatePresence>
                                            {searchResults.length > 0 && (
                                                <motion.ul
                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    className="absolute z-50 w-full mt-2 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/50 max-h-60 overflow-y-auto custom-scrollbar ring-1 ring-white/5"
                                                >
                                                    {searchResults.map((anime) => (
                                                        <li key={anime.id}
                                                            onClick={() => handleSelectAnime(anime)}
                                                            className="p-3 hover:bg-white/10 cursor-pointer flex items-center gap-3 transition-colors border-b border-white/5 last:border-0 group/item"
                                                        >
                                                            <div className="w-10 h-14 rounded-lg bg-white/5 shrink-0 overflow-hidden relative">
                                                                {anime.cover ? (
                                                                    <img src={anime.cover} alt={anime.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center">
                                                                        <Film size={14} className="text-white/50" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col overflow-hidden">
                                                                <span className="font-bold text-sm truncate text-white group-hover/item:text-netflix-blue-100 transition-colors">{anime.name}</span>
                                                                {anime.secondaryName && <span className="text-xs text-white/40 truncate">{anime.secondaryName}</span>}
                                                            </div>
                                                        </li>
                                                    ))}
                                                </motion.ul>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex items-center justify-between p-4 bg-netflix-blue-100/10 border border-netflix-blue-100/30 rounded-xl md:rounded-2xl shadow-lg shadow-netflix-blue-100/5 backdrop-blur-sm"
                                    >
                                        <div className="flex items-center gap-4 overflow-hidden">
                                            <div className="w-12 h-16 rounded-lg bg-netflix-blue-100/20 shrink-0 overflow-hidden relative border border-white/10">
                                                {selectedAnime.cover ? (
                                                    <img src={selectedAnime.cover} alt={selectedAnime.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Film size={20} className="text-netflix-blue-100" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="text-xs text-netflix-blue-100 font-bold uppercase tracking-wider">Selected Anime</span>
                                                <span className="font-bold text-lg text-white truncate">{selectedAnime.name}</span>
                                                <span className="text-xs text-white/50 truncate">Folder: {selectedAnime.name}/...</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={clearSelectedAnime}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-white transition-all shrink-0"
                                        >
                                            <div className="sr-only">Clear</div>
                                            <X size={20} />
                                        </button>
                                    </motion.div>
                                )}
                            </div>

                            <AnimatePresence>
                                {selectedAnime && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-6 overflow-hidden"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider pl-1">Source Type</label>
                                                <div className="flex bg-white/5 rounded-xl p-1 border border-white/10 h-[58px]">
                                                    <label className={`flex-1 flex items-center justify-center cursor-pointer rounded-lg transition-all ${sourceType === 'sub' ? 'bg-netflix-blue-100 text-black shadow-lg font-bold' : 'text-white/50 hover:text-white'}`}>
                                                        <input type="radio" name="sourceType" value="sub" checked={sourceType === 'sub'} onChange={() => setSourceType('sub')} className="hidden" />
                                                        <span>Sub</span>
                                                    </label>
                                                    <label className={`flex-1 flex items-center justify-center cursor-pointer rounded-lg transition-all ${sourceType === 'dub' ? 'bg-netflix-blue-100 text-black shadow-lg font-bold' : 'text-white/50 hover:text-white'}`}>
                                                        <input type="radio" name="sourceType" value="dub" checked={sourceType === 'dub'} onChange={() => setSourceType('dub')} className="hidden" />
                                                        <span>Dub</span>
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider pl-1">Source Name</label>
                                                <input
                                                    type="text"
                                                    value={sourceName}
                                                    onChange={(e) => setSourceName(e.target.value)}
                                                    placeholder="e.g. Tengoku"
                                                    className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white focus:border-netflix-blue-100/50 focus:bg-white/10 focus:outline-none transition-all font-medium"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-white/50 uppercase tracking-wider pl-1">Timings (Optional)</label>
                                            <div className="grid grid-cols-2 gap-3 p-4 bg-white/5 border border-white/10 rounded-xl">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] text-white/40 uppercase font-bold text-center block">Op Start</label>
                                                    <input type="text" value={timings.openingStart} onChange={(e) => setTimings({ ...timings, openingStart: e.target.value })} placeholder="01:30" className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white text-sm text-center outline-none focus:border-netflix-blue-100" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] text-white/40 uppercase font-bold text-center block">Op Top End</label>
                                                    <input type="text" value={timings.openingEnd} onChange={(e) => setTimings({ ...timings, openingEnd: e.target.value })} placeholder="03:00" className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white text-sm text-center outline-none focus:border-netflix-blue-100" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] text-white/40 uppercase font-bold text-center block">End Start</label>
                                                    <input type="text" value={timings.endingStart} onChange={(e) => setTimings({ ...timings, endingStart: e.target.value })} placeholder="22:00" className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white text-sm text-center outline-none focus:border-netflix-blue-100" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] text-white/40 uppercase font-bold text-center block">End Top End</label>
                                                    <input type="text" value={timings.endingEnd} onChange={(e) => setTimings({ ...timings, endingEnd: e.target.value })} placeholder="23:30" className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white text-sm text-center outline-none focus:border-netflix-blue-100" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-white/50 uppercase tracking-wider pl-1">Video Files</label>
                                            <div
                                                {...getRootProps()}
                                                className={`
                                                    border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300
                                                    ${isDragActive ? 'border-netflix-blue-100 bg-netflix-blue-100/10 scale-102' : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'}
                                                `}
                                            >
                                                <input {...getInputProps()} />
                                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                                                    <Upload className={`text-white/50 ${isDragActive ? 'text-netflix-blue-100' : ''}`} size={24} />
                                                </div>
                                                <div className="text-center space-y-1">
                                                    <p className="text-sm font-bold text-white/80">
                                                        {isDragActive ? "Drop videos here" : "Click to upload multiple videos"}
                                                    </p>
                                                    <p className="text-xs text-white/40">MP4, MKV, WebM allowed</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* File List / Queue */}
                                        <AnimatePresence>
                                            {uploadQueue.length > 0 && (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar bg-black/20 rounded-xl p-2 border border-white/5"
                                                >
                                                    {uploadQueue.map((item, index) => (
                                                        <motion.div
                                                            key={item.id}
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, x: -10 }}
                                                            className="flex items-center gap-4 p-3 bg-white/5 rounded-lg border border-white/5 group"
                                                        >
                                                            <div className="w-8 h-8 rounded bg-netflix-blue-100/10 flex items-center justify-center shrink-0">
                                                                <FileVideo size={16} className="text-netflix-blue-100" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs text-white/40 truncate">{item.file.name}</p>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] text-white/30 font-bold uppercase">Episode</span>
                                                                    <input
                                                                        type="number"
                                                                        value={item.episodeNumber}
                                                                        onChange={(e) => updateEpisodeNumber(item.id, e.target.value)}
                                                                        className="bg-transparent border-b border-white/10 text-white text-sm font-bold w-12 text-center focus:border-netflix-blue-100 focus:outline-none p-0"
                                                                        placeholder="#"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => removeFile(item.id)}
                                                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/30 hover:text-white transition-colors"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </motion.div>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {uploadQueue.length > 0 && (
                                            <button
                                                onClick={processQueue}
                                                disabled={isUploading || uploadQueue.some(item => !item.episodeNumber)}
                                                className={`
                                                    w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all duration-300
                                                    ${isUploading
                                                        ? 'bg-white/10 text-white/50 cursor-not-allowed'
                                                        : 'bg-netflix-blue-100 hover:bg-cyan-400 text-black shadow-netflix-blue-100/20'
                                                    }
                                                `}
                                            >
                                                {isUploading ? (
                                                    <>
                                                        <Loader2 className="animate-spin" size={20} />
                                                        <span>Syncing Database...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        Upload {uploadQueue.length} Files
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </main>
            </div>

            {/* Toaster / Progress Notification Area */}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none">
                <AnimatePresence>
                    {uploadQueue.filter(item => item.status !== 'pending').map((item) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: 20, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.95 }}
                            layout
                            className="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-xl shadow-2xl pointer-events-auto"
                        >
                            <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex flex-col min-w-0">
                                    <span className="text-white font-bold text-sm truncate w-full">Episode {item.episodeNumber}</span>
                                    <span className="text-[10px] text-white/40 truncate max-w-[200px]">{item.file.name}</span>
                                </div>
                                <div className="shrink-0">
                                    {item.status === 'uploading' && <Loader2 size={16} className="animate-spin text-netflix-blue-100" />}
                                    {item.status === 'success' && <Check size={16} className="text-green-500" />}
                                    {item.status === 'error' && <AlertCircle size={16} className="text-red-500" />}
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-1">
                                <motion.div
                                    className={`h-full ${item.status === 'error' ? 'bg-red-500' : item.status === 'success' ? 'bg-green-500' : 'bg-netflix-blue-100'}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${item.progress}%` }}
                                    transition={{ type: "spring", stiffness: 50 }}
                                />
                            </div>

                            <div className="flex justify-between items-center text-[10px]">
                                <span className="text-white/60">
                                    {item.status === 'uploading' && item.loaded && item.total ? (
                                        item.progress === 100 ? (
                                            <span className="text-netflix-blue-100 animate-pulse font-bold">Finalizing & Syncing Database...</span>
                                        ) : (
                                            <span className="font-mono">
                                                {formatBytes(item.speed || 0)}/s • {formatBytes(item.loaded)} / {formatBytes(item.total)}
                                            </span>
                                        )
                                    ) : (
                                        <span className="text-white/40">
                                            {item.status === 'success' ? 'Upload Complete' : item.status === 'error' ? 'Failed' : 'Starting...'}
                                        </span>
                                    )}
                                </span>
                                <span className="text-white/80 font-bold font-mono">{item.progress}%</span>
                            </div>

                            {item.status === 'error' && (
                                <p className="text-[10px] text-red-500 mt-1">{item.message}</p>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
