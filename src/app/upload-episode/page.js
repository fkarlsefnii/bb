'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, ArrowLeft, Upload, Check, AlertCircle, Film, FileVideo, X, Play, Clock, CloudUpload as CloudUploadIcon } from 'lucide-react';
import { searchAnimeInDB, searchAnimeFolders } from '@/app/actions';
import { formatBytes } from '@/lib/utils';
import { useDropzone } from 'react-dropzone';
import { Folder, Database } from 'lucide-react';

export default function UploadEpisodePage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedAnime, setSelectedAnime] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchMode, setSearchMode] = useState('db'); // 'db' or 'folder'

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
                let res;
                if (searchMode === 'db') {
                    res = await searchAnimeInDB(searchQuery);
                } else {
                    res = await searchAnimeFolders(searchQuery);
                }

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
    }, [searchQuery, searchMode]);

    // Clear search results when mode changes
    useEffect(() => {
        setSearchResults([]);
        setSearchQuery('');
    }, [searchMode]);

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
                if (selectedAnime.id) {
                    formData.append('animeId', selectedAnime.id);
                }
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
        <div className="min-h-screen bg-black text-white font-sans overflow-y-auto selection:bg-netflix-blue selection:text-white pb-32 relative">
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

            {/* Content */}
            <div className="relative z-10 container mx-auto px-4 py-8 flex flex-col items-center min-h-[calc(100vh-4rem)]">

                {/* Header */}
                <header className="w-full max-w-4xl flex items-center justify-between mb-12 relative z-20">
                    <Link href="/" className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all border border-white/5 hover:border-white/20 backdrop-blur-md">
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform text-netflix-blue-100" />
                        <span className="text-sm font-bold">Back to Manager</span>
                    </Link>
                    <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400 drop-shadow-sm tracking-tight">
                        Upload Episode
                    </h1>
                </header>

                <main className="w-full max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-700 relative">
                    {/* Glass Background & Glow Effects */}
                    <div className="absolute inset-0 rounded-[2rem] overflow-hidden border border-white/10 bg-black/20 backdrop-blur-2xl shadow-2xl pointer-events-none z-0">
                        <div className="absolute -top-32 -right-32 w-80 h-80 bg-netflix-blue-100/10 rounded-full blur-[100px]" />
                        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px]" />
                    </div>

                    {/* Main Content */}
                    <div className="relative z-10 p-8 md:p-10">
                        <div className="text-center mb-10 relative">
                            <h2 className="text-2xl font-black text-white mb-3 tracking-tight">New Episode Upload</h2>
                            <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">Select an anime from Database and upload one or multiple video files.</p>
                        </div>

                        {/* Search / Select Anime */}
                        {/* Search / Select Anime */}
                        <div className="space-y-8 relative z-10">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-netflix-blue-100 uppercase tracking-[0.2em] pl-1 opacity-80">
                                        Target {searchMode === 'db' ? 'Anime (MongoDB)' : 'Folder (B2 Storage)'}
                                    </label>
                                </div>
                                {!selectedAnime ? (
                                    <div className="relative group">
                                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-netflix-blue-100 transition-colors" size={20} />

                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder={searchMode === 'db' ? "Search anime database..." : "Search existing folders..."}
                                            className="w-full pl-14 pr-32 py-5 bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl text-white placeholder:text-gray-600 focus:border-netflix-blue-100/50 focus:bg-black/40 focus:outline-none focus:ring-1 focus:ring-netflix-blue-100/50 transition-all font-medium shadow-inner"
                                        />

                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
                                            {isSearching && (
                                                <Loader2 className="animate-spin text-netflix-blue-100" size={18} />
                                            )}

                                            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/5">
                                                <button
                                                    onClick={() => setSearchMode('db')}
                                                    className={`p-1.5 rounded-md transition-all ${searchMode === 'db' ? 'bg-netflix-blue-100/20 text-netflix-blue-100' : 'text-gray-500 hover:text-white'}`}
                                                    title="Search MongoDB Database"
                                                >
                                                    <Database size={14} />
                                                </button>
                                                <button
                                                    onClick={() => setSearchMode('folder')}
                                                    className={`p-1.5 rounded-md transition-all ${searchMode === 'folder' ? 'bg-netflix-blue-100/20 text-netflix-blue-100' : 'text-gray-500 hover:text-white'}`}
                                                    title="Search B2 Folders directly"
                                                >
                                                    <Folder size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Dropdown Results */}
                                        <AnimatePresence>
                                            {searchResults.length > 0 && (
                                                <motion.ul
                                                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                                                    className="absolute z-50 w-full mt-2 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/80 max-h-80 overflow-y-auto custom-scrollbar ring-1 ring-white/5"
                                                >
                                                    {searchResults.map((anime, index) => (
                                                        <li key={anime.id || anime.path || index}
                                                            onClick={() => handleSelectAnime(anime)}
                                                            className="p-4 hover:bg-white/5 cursor-pointer flex items-center gap-4 transition-colors border-b border-white/5 last:border-0 group/item relative overflow-hidden"
                                                        >
                                                            <div className="absolute inset-0 bg-gradient-to-r from-netflix-blue-100/5 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity" />

                                                            <div className="w-12 h-16 rounded-lg bg-white/5 shrink-0 overflow-hidden relative shadow-lg ring-1 ring-white/10 group-hover/item:ring-netflix-blue-100/30 transition-all flex items-center justify-center">
                                                                {anime.cover ? (
                                                                    <img src={anime.cover} alt={anime.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="text-gray-600">
                                                                        {searchMode === 'folder' ? <Folder size={20} /> : <Film size={16} />}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col min-w-0 z-10">
                                                                <span className="font-bold text-sm truncate text-gray-200 group-hover/item:text-white transition-colors">{anime.name}</span>
                                                                {anime.secondaryName ? (
                                                                    <span className="text-xs text-gray-500 truncate group-hover/item:text-gray-400">{anime.secondaryName}</span>
                                                                ) : (
                                                                    <span className="text-xs text-gray-600 font-mono truncate">{anime.path || 'Folder'}</span>
                                                                )}
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
                                        className="flex items-center justify-between p-5 bg-gradient-to-r from-netflix-blue-100/10 to-transparent border border-netflix-blue-100/20 rounded-2xl shadow-lg relative overflow-hidden group"
                                    >
                                        <div className="absolute inset-0 bg-netflix-blue-100/5 blur-xl group-hover:bg-netflix-blue-100/10 transition-colors duration-500" />

                                        <div className="flex items-center gap-5 overflow-hidden relative z-10">
                                            <div className="w-14 h-20 rounded-xl bg-netflix-blue-100/20 shrink-0 overflow-hidden relative border border-white/10 shadow-2xl transform group-hover:scale-105 transition-transform duration-300">
                                                {selectedAnime.cover ? (
                                                    <img src={selectedAnime.cover} alt={selectedAnime.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-black/40">
                                                        {searchMode === 'folder' ? <Folder size={32} className="text-netflix-blue-100" /> : <Film size={24} className="text-netflix-blue-100" />}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col overflow-hidden gap-1">
                                                <span className="text-[10px] text-netflix-blue-100 font-black uppercase tracking-[0.1em]">{searchMode === 'db' ? 'Selected Anime' : 'Selected Folder'}</span>
                                                <span className="font-black text-xl text-white truncate drop-shadow-sm">{selectedAnime.name}</span>
                                                <span className="text-xs text-gray-400 truncate font-mono bg-black/30 px-2 py-1 rounded w-fit">
                                                    {searchMode === 'db' ? `Folder: ${selectedAnime.name}/...` : `Path: ${selectedAnime.path || selectedAnime.name}`}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={clearSelectedAnime}
                                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-black/40 hover:bg-red-500/20 hover:text-red-400 text-gray-400 transition-all shrink-0 border border-white/5 hover:border-red-500/30 relative z-10 backdrop-blur-sm"
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
                                        className="space-y-8 overflow-hidden"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] pl-1">Source Type</label>
                                                <div className="flex bg-black/40 rounded-xl p-1.5 border border-white/10 h-[64px] relative">
                                                    <label className={`flex-1 flex items-center justify-center cursor-pointer rounded-lg transition-all duration-300 z-10 font-bold ${sourceType === 'sub' ? 'text-black' : 'text-gray-500 hover:text-white'}`}>
                                                        <input type="radio" name="sourceType" value="sub" checked={sourceType === 'sub'} onChange={() => setSourceType('sub')} className="hidden" />
                                                        <span>Sub</span>
                                                    </label>
                                                    <label className={`flex-1 flex items-center justify-center cursor-pointer rounded-lg transition-all duration-300 z-10 font-bold ${sourceType === 'dub' ? 'text-black' : 'text-gray-500 hover:text-white'}`}>
                                                        <input type="radio" name="sourceType" value="dub" checked={sourceType === 'dub'} onChange={() => setSourceType('dub')} className="hidden" />
                                                        <span>Dub</span>
                                                    </label>

                                                    {/* Animated Background Slider */}
                                                    <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-netflix-blue-100 rounded-lg shadow-lg shadow-netflix-blue-100/20 transition-all duration-300 ${sourceType === 'dub' ? 'left-[50%]' : 'left-1.5'}`} />
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] pl-1">Source Name</label>
                                                <input
                                                    type="text"
                                                    value={sourceName}
                                                    onChange={(e) => setSourceName(e.target.value)}
                                                    placeholder="e.g. Tengoku"
                                                    className="w-full px-5 py-5 bg-black/40 border border-white/10 rounded-2xl text-white placeholder:text-gray-600 focus:border-netflix-blue-100/50 focus:bg-black/60 focus:outline-none transition-all font-medium h-[64px]"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] pl-1">Timings (Optional)</label>
                                            <div className="grid grid-cols-2 gap-4 p-5 bg-black/40 border border-white/10 rounded-2xl relative overflow-hidden">
                                                <div className="absolute inset-0 bg-white/5 opacity-50 backdrop-blur-sm pointer-events-none" />

                                                {[
                                                    { label: "Op Start", val: timings.openingStart, key: 'openingStart', ph: "01:30" },
                                                    { label: "Op End", val: timings.openingEnd, key: 'openingEnd', ph: "03:00" },
                                                    { label: "End Start", val: timings.endingStart, key: 'endingStart', ph: "22:00" },
                                                    { label: "End End", val: timings.endingEnd, key: 'endingEnd', ph: "23:30" },
                                                ].map((t, i) => (
                                                    <div key={i} className="space-y-1 relative z-10">
                                                        <label className="text-[9px] text-gray-500 uppercase font-black text-center block mb-1">{t.label}</label>
                                                        <input
                                                            type="text"
                                                            value={t.val}
                                                            onChange={(e) => setTimings({ ...timings, [t.key]: e.target.value })}
                                                            placeholder={t.ph}
                                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm text-center outline-none focus:border-netflix-blue-100/50 focus:ring-1 focus:ring-netflix-blue-100/20 font-mono transition-all hover:bg-black/60"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] pl-1">Video Files</label>
                                            <div
                                                {...getRootProps()}
                                                className={`
                                                    border-2 border-dashed rounded-[2rem] p-10 flex flex-col items-center justify-center gap-6 cursor-pointer transition-all duration-300 relative overflow-hidden group
                                                    ${isDragActive ? 'border-netflix-blue-100 bg-netflix-blue-100/5 scale-[1.02]' : 'border-white/10 bg-black/20 hover:bg-black/40 hover:border-white/20'}
                                                `}
                                            >
                                                <input {...getInputProps()} />

                                                {/* Animated Glow on Drag */}
                                                <div className={`absolute inset-0 bg-netflix-blue-100/5 blur-3xl transition-opacity duration-300 ${isDragActive ? 'opacity-100' : 'opacity-0'}`} />

                                                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center border border-white/5 shadow-2xl relative z-10 group-hover:scale-110 transition-transform duration-300`}>
                                                    <Upload className={`text-gray-400 ${isDragActive ? 'text-netflix-blue-100' : 'group-hover:text-white'} transition-colors`} size={28} />
                                                </div>
                                                <div className="text-center space-y-2 relative z-10">
                                                    <p className="text-base font-bold text-white group-hover:text-netflix-blue-100 transition-colors">
                                                        {isDragActive ? "Drop videos here" : "Click to upload multiple videos"}
                                                    </p>
                                                    <p className="text-xs text-gray-500 font-medium tracking-wide bg-black/30 px-3 py-1 rounded-full border border-white/5">MP4, MKV, WebM allowed</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* File List / Queue */}
                                        <AnimatePresence>
                                            {uploadQueue.length > 0 && (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar bg-black/40 rounded-2xl p-3 border border-white/10 shadow-inner"
                                                >
                                                    {uploadQueue.map((item, index) => (
                                                        <motion.div
                                                            key={item.id}
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, x: -10 }}
                                                            className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5 group hover:bg-white/10 transition-colors"
                                                        >
                                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-netflix-blue-100/20 to-blue-600/20 flex items-center justify-center shrink-0 border border-white/5">
                                                                <FileVideo size={18} className="text-netflix-blue-100" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs text-gray-400 truncate font-mono mb-1">{item.file.name}</p>
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-[10px] text-netflix-blue-100 font-black uppercase tracking-wider bg-netflix-blue-100/10 px-1.5 py-0.5 rounded">Episode</span>
                                                                    <div className="relative">
                                                                        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold">#</span>
                                                                        <input
                                                                            type="number"
                                                                            value={item.episodeNumber}
                                                                            onChange={(e) => updateEpisodeNumber(item.id, e.target.value)}
                                                                            className="bg-transparent border-b border-gray-600 text-white text-sm font-bold w-12 text-center focus:border-netflix-blue-100 focus:outline-none p-0 pl-3 transition-colors"
                                                                            placeholder="1"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => removeFile(item.id)}
                                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-black/40 hover:bg-red-500 hover:text-white text-gray-500 transition-all border border-white/5 hover:border-red-500"
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
                                                    w-full py-5 rounded-2xl font-black text-lg shadow-[0_0_20px_rgba(0,0,0,0.3)] flex items-center justify-center gap-3 transition-all duration-300 transform hover:-translate-y-1
                                                    ${isUploading
                                                        ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                                                        : 'bg-netflix-blue-100 hover:bg-cyan-400 text-black shadow-netflix-blue-100/20 hover:shadow-cyan-400/40'
                                                    }
                                                `}
                                            >
                                                {isUploading ? (
                                                    <>
                                                        <Loader2 className="animate-spin" size={24} />
                                                        <span className="tracking-wide">Syncing Database...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <CloudUploadIcon size={24} strokeWidth={2.5} />
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
