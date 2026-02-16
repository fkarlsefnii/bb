import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Head from '../components/CustomHead';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInstagram, faDiscord, faTiktok, faTelegram } from '@fortawesome/free-brands-svg-icons';
import TranslationsSummary from '@/components/TranslationSummary';
import AboutSkeleton from '@/components/skeletons/AboutSkeleton';

export default function AboutPage() {
    const bannerSrc = 'https://i.postimg.cc/g0M89Nv2/Banner.png';
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const t = setTimeout(() => setLoading(false), 500);
        return () => clearTimeout(t);
    }, []);

    const socials = [
        {
            id: 'instagram',
            label: 'Instagram',
            href: 'https://www.instagram.com/tengoku.az?utm_source=ig_web_button_share_sheet&igsh=MWtwNmU3aW4zYzQ0cg==',
            icon: faInstagram,
            reason: 'Bütün yeniliklər və elanlar üçün əsas platformamızdır. Storydə ən son yeniliklər paylaşılır.',
            color: 'from-pink-500 to-purple-600'
        },
        {
            id: 'tiktok',
            label: 'TikTok',
            href: 'https://www.tiktok.com/@tengoku.az',
            icon: faTiktok,
            reason: 'Qısa kliplər, sürətli əyləncəli videolar üçün.',
            color: 'from-black to-gray-800'
        },
        {
            id: 'telegram',
            label: 'Telegram',
            href: 'https://t.me/tengokufansub',
            icon: faTelegram,
            reason: 'Bütün bölümlər burada paylaşılır, həmçinin xəbərlər və elanlar üçün.',
            color: 'from-blue-400 to-blue-600'
        },
        {
            id: 'discord',
            label: 'Discord',
            href: 'https://discord.gg/twUMtqEDDv',
            icon: faDiscord,
            reason: 'İzləyicilərin bir-biri ilə əlaqə qurması və müzakirələr aparması üçün ən yaxşı platforma.',
            color: 'from-indigo-500 to-indigo-700'
        },
    ];

    if (loading) {
        return (
            <>
                <Head title="Haqqımızda — Tengoku FanSub" />
                <Navbar />
                <main className="lg:pt-[4.7rem] pt-[4rem] min-h-screen text-white mt-3 relative overflow-hidden">
                    <div className="absolute inset-0 bg-black/90 z-[-1]" />
                    <div className="container mx-auto px-4 lg:px-[4rem]">

                        {/* Hero Skeleton (Title & Text) */}
                        <div className="text-center mb-16 pt-10">
                            <div className="h-12 w-64 mx-auto bg-white/10 rounded-lg animate-pulse mb-6" />
                            <div className="h-4 w-96 mx-auto bg-white/5 rounded animate-pulse" />
                        </div>

                        {/* Stats Skeleton (Glass Card matching CommunitySlider) */}
                        <div className="mb-16">
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 md:p-12">
                                <div className="flex flex-col md:flex-row gap-4">
                                    {/* Slider Left */}
                                    <div className="w-full md:w-1/2 aspect-[29/8] bg-white/5 rounded-md animate-pulse" />
                                    {/* Stats Right */}
                                    <div className="w-full md:w-1/2 flex gap-4">
                                        <div className="flex-1 bg-white/5 rounded-md animate-pulse" />
                                        <div className="flex-1 bg-white/5 rounded-md animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Mission Text Skeleton */}
                        <div className="max-w-4xl mx-auto mb-16 space-y-3">
                            <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
                            <div className="h-4 w-5/6 mx-auto bg-white/5 rounded animate-pulse" />
                            <div className="h-4 w-4/6 mx-auto bg-white/5 rounded animate-pulse" />
                        </div>

                        {/* Social Cards Skeleton */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-64 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/5 animate-pulse flex flex-col items-center p-8">
                                    <div className="w-16 h-16 rounded-full bg-white/10 mb-6" />
                                    <div className="h-6 w-24 bg-white/10 rounded mb-3" />
                                    <div className="h-3 w-32 bg-white/5 rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Head title="Haqqımızda — Tengoku FanSub" />
            <Navbar />

            <div className="relative min-h-screen bg-black text-white selection:bg-netflix-blue selection:text-white overflow-hidden">
                {/* Background Parallax-like Effect */}
                <div aria-hidden="true" className="fixed inset-0 pointer-events-none z-0">
                    <div
                        className="absolute inset-0 bg-center bg-cover bg-no-repeat opacity-40 scale-105 blur-md"
                        style={{ backgroundImage: `url(${bannerSrc})` }}
                    />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
                </div>

                <div className="relative z-10 lg:pt-[5rem] pt-[4.5rem] pb-12">
                    <div className="container mx-auto px-4 lg:px-8">

                        {/* Hero Section */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="text-center mb-16 pt-10"
                        >
                            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent drop-shadow-sm">
                                Biz Kimik?
                            </h1>
                            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed font-light">
                                <span className="text-netflix-blue font-semibold">Tengoku Fansub</span> — Yapon mədəniyyətini və anime dünyasını Azərbaycan dilində kəşf etmək üçün yaratdığımız bir "cənnət"dir.
                            </p>
                        </motion.div>

                        {/* Stats Section with Glassmorphism */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="mb-16"
                        >
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 md:p-12 shadow-2xl relative overflow-hidden group hover:border-white/20 transition-all duration-500">
                                <div className="absolute inset-0 bg-gradient-to-br from-netflix-blue/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <TranslationsSummary />
                            </div>
                        </motion.div>

                        {/* Mission Text */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                            className="max-w-4xl mx-auto mb-16"
                        >
                            <div className="prose prose-invert prose-lg mx-auto text-gray-300 text-center">
                                <p className="leading-8">
                                    Məqsədimiz anime sevərlərə sevdikləri dünyaları ana dilimizdə ən yüksək keyfiyyətdə çatdırmaqdır.
                                    Biz həm dəqiq tərcüməyə önəm verir, həm də izləyicilərimizlə səmimi bir bağ qurmağa çalışırıq.
                                    Sadəcə bir tərcümə qrupu deyil, eyni maraqları paylaşan insanların bir araya gəldiyi böyük bir ailəyik.
                                </p>
                            </div>
                        </motion.div>

                        {/* Social Cards Grid */}
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={{
                                hidden: { opacity: 0 },
                                visible: {
                                    opacity: 1,
                                    transition: {
                                        staggerChildren: 0.15
                                    }
                                }
                            }}
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
                        >
                            {socials.map((s) => (
                                <motion.a
                                    key={s.id}
                                    href={s.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    variants={{
                                        hidden: { opacity: 0, y: 20 },
                                        visible: { opacity: 1, y: 0 }
                                    }}
                                    className="group relative flex flex-col items-center p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl overflow-hidden"
                                >
                                    {/* Hover Gradient Background */}
                                    <div className={`absolute inset-0 bg-gradient-to-br ${s.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />

                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br ${s.color} mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                        <FontAwesomeIcon icon={s.icon} className="text-3xl text-white" />
                                    </div>

                                    <h3 className="text-xl font-bold mb-3 group-hover:text-white transition-colors">{s.label}</h3>
                                    <p className="text-sm text-gray-400 text-center leading-relaxed group-hover:text-gray-300 transition-colors">
                                        {s.reason}
                                    </p>

                                    <div className="mt-6 text-xs font-semibold uppercase tracking-wider text-Netflix-blue-100 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 text-blue-400">
                                        Qoşul <span aria-hidden="true">&rarr;</span>
                                    </div>
                                </motion.a>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </div>

            <Footer />
        </>
    );
}
