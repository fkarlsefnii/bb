import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Head from '../components/CustomHead';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import TranslationsSummary from '@/components/TranslationSummary';
import TeamSkeleton from '@/components/skeletons/TeamSkeleton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInstagram, faDiscord } from '@fortawesome/free-brands-svg-icons';
import { faUsers, faPenNib, faArrowRight, faMicrophone } from '@fortawesome/free-solid-svg-icons';

// Team page with loading skeleton
export default function TeamPage() {
  const bannerSrc = 'https://i.postimg.cc/NF1XWKGt/Komanda.png';
  const [loading, setLoading] = useState(true);
  const cardsRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const items = [
    {
      id: 1,
      title: 'Tərcümə Komandası',
      category: 'Tərcümə',
      desc: 'AegiSub proqramından istifadə edərək fayla yazılmış hazır dialoqları tərcümə edirik. Dəqiqlik və kontekst bizim üçün hər şeydir.',
      img: 'https://i.postimg.cc/MG7fmqJ4/quality-restoration-20250906170336774.png',
      tags: ['Subtitr', 'Kontekst', 'Dəqiqlik'],
      icon: faUsers,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 2,
      title: 'Səsləndirmə Komandası',
      category: 'Dublaj',
      desc: 'Personajlara həyat verən səslər. Emosiya və intonasiya ilə obrazları canlandırırıq. Həm həvəskar, həm peşəkar səsləri gözləyirik.',
      img: 'https://i.postimg.cc/HkVsSFxr/image.png',
      tags: ['Səs', 'Mikrofon', 'Dublaj'],
      icon: faMicrophone,
      color: 'from-emerald-500 to-teal-500'
    },
    {
      id: 4,
      title: 'Editor & Kontent',
      category: 'Kreativ',
      desc: 'Kreativ klip, qısa videolar (Reels/Shorts) və sosial media kontenti yaradan yaradıcılara meydanı veririk.',
      img: 'https://i.postimg.cc/Zqx0yHrz/quality-restoration-20250906170330637.png',
      tags: ['Reels', 'Edit', 'Dizayn'],
      icon: faPenNib,
      color: 'from-orange-500 to-yellow-500'
    },
  ];

  const scrollToCards = () => {
    cardsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return (
      <>
        <Head title="Komandamız — Tengoku FanSub" />
        <Navbar />
        <main className="lg:pt-[4.7rem] pt-[4rem] min-h-screen text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black/90 z-[-1]" />
          <div className="container mx-auto px-4 lg:px-[4rem] mt-6">

            {/* Hero Banner Skeleton */}
            <div className="relative w-full mb-16 pt-6">
              <div className="w-full aspect-[21/7] rounded-2xl bg-white/5 animate-pulse ring-1 ring-white/5" />
            </div>

            {/* Stats Skeleton */}
            <div className="mb-12 h-24 bg-white/5 rounded-xl animate-pulse" />

            {/* Intro Text & Buttons Skeleton */}
            <div className="max-w-5xl mx-auto text-center mb-16">
              <div className="h-4 w-3/4 mx-auto bg-white/5 rounded mb-3 animate-pulse" />
              <div className="h-4 w-1/2 mx-auto bg-white/5 rounded mb-8 animate-pulse" />

              <div className="flex flex-wrap justify-center gap-4 text-center">
                <div className="h-12 w-40 rounded-full bg-white/10 animate-pulse" />
                <div className="h-12 w-40 rounded-full bg-white/10 animate-pulse" />
                <div className="h-12 w-40 rounded-full bg-white/10 animate-pulse" />
              </div>
            </div>

            {/* Roles Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-[400px] bg-white/5 rounded-2xl animate-pulse flex flex-col">
                  {/* Image area */}
                  <div className="h-48 bg-white/10 w-full" />
                  {/* Content area */}
                  <div className="p-6 space-y-4 flex-1">
                    <div className="h-4 w-full bg-white/5 rounded" />
                    <div className="h-4 w-5/6 bg-white/5 rounded" />
                    <div className="mt-auto flex gap-2 pt-8">
                      <div className="h-6 w-16 bg-white/10 rounded-full" />
                      <div className="h-6 w-16 bg-white/10 rounded-full" />
                    </div>
                  </div>
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
      <Head title="Komandamız — Tengoku FanSub" />
      <Navbar />

      <div className="relative min-h-screen bg-black text-white selection:bg-netflix-blue selection:text-white overflow-hidden">
        {/* Background Effects */}
        <div aria-hidden="true" className="fixed inset-0 pointer-events-none z-0">
          <div
            className="absolute inset-0 bg-center bg-cover bg-no-repeat opacity-40 scale-105 blur-sm"
            style={{ backgroundImage: `url(${bannerSrc})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
        </div>

        <div className="relative z-10 lg:pt-[5rem] pt-[4.5rem] pb-16">
          <div className="container mx-auto px-4 lg:px-8">

            {/* Hero Section */}
            <header className="relative w-full pt-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7 }}
                className="relative overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-2xl group"
              >
                <img src={bannerSrc} alt="Komandamız Banner" className="w-full aspect-[21/7] object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col items-center justify-end pb-4 md:pb-6">
                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-white mb-1 text-center drop-shadow-lg"
                  >
                    KOMANDAMIZA QOŞUL
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-white/80 text-sm md:text-lg max-w-2xl text-center px-4 font-normal"
                  >
                    Anime dünyasını Azərbaycan dilində yaşatmaq üçün sən də bizə qatıl!
                  </motion.p>
                </div>
              </motion.div>
            </header>



            {/* Intro & CTAs */}
            <section className="py-12 max-w-5xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center"
              >
                <p className="text-lg md:text-xl text-gray-300 leading-relaxed font-normal mb-8">
                  Anime ilə bağlı hər şeyə açığıq — <span className="text-white font-medium">tərcümə, səsləndirmə, cosplay, editorluq</span>.
                  İstər hobbist ol, istərsə də peşəkar, sənin istedadına ehtiyacımız var.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-4">

                  <button
                    onClick={scrollToCards}
                    className="px-8 py-3 rounded-full bg-white text-black font-bold hover:bg-gray-200 transition-all duration-300 shadow-lg hover:scale-105 active:scale-95 flex items-center gap-2"
                  >
                    <span>Nə edə bilərəm?</span>
                    <FontAwesomeIcon icon={faArrowRight} />
                  </button>

                  <a
                    href="https://www.instagram.com/tengoku.az"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-8 py-3 rounded-full bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold hover:shadow-lg hover:shadow-pink-500/30 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faInstagram} className="text-xl" />
                    <span>Instagram</span>
                  </a>

                  <a
                    href="https://discord.gg/twUMtqEDDv"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-8 py-3 rounded-full bg-[#5865F2] text-white font-bold hover:shadow-lg hover:shadow-[#5865F2]/30 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faDiscord} className="text-xl" />
                    <span>Discord</span>
                  </a>
                </div>
              </motion.div>
            </section>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 md:p-12 shadow-2xl relative overflow-hidden group hover:border-white/20 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-netflix-blue/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <TranslationsSummary />
            </div>
            {/* Roles Grid */}
            <section ref={cardsRef} className="py-12">
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="flex items-center justify-center gap-3 mb-12 opacity-50"
              >
                <div className="h-[1px] w-24 bg-gradient-to-r from-transparent to-white/50" />
                <span className="text-sm uppercase tracking-[0.2em] text-white/70">Vakansiyalar</span>
                <div className="h-[1px] w-24 bg-gradient-to-l from-transparent to-white/50" />
              </motion.div>

              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.15 }
                  }
                }}
                className="grid grid-cols-1 md:grid-cols-3 gap-8"
              >
                {items.map((item) => (
                  <motion.article
                    key={item.id}
                    variants={{
                      hidden: { opacity: 0, y: 30 },
                      visible: { opacity: 1, y: 0 }
                    }}
                    className="group relative bg-white/5 backdrop-blur-md rounded-2xl overflow-hidden border border-white/10 hover:border-white/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl flex flex-col h-full"
                  >
                    {/* Image Area */}
                    <div className="relative h-48 overflow-hidden">
                      <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-20 group-hover:opacity-30 transition-opacity duration-500`} />
                      <img src={item.img} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] to-transparent" />
                      <div className="absolute bottom-4 left-4">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center text-white shadow-lg mb-2`}>
                          <FontAwesomeIcon icon={item.icon} />
                        </div>
                        <h3 className="text-xl font-bold text-white group-hover:text-netflix-blue-100 transition-colors">{item.title}</h3>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 flex flex-col flex-grow">
                      <p className="text-gray-400 text-sm leading-relaxed mb-6 font-normal">{item.desc}</p>

                      <div className="mt-auto flex flex-wrap gap-2">
                        {item.tags.map(tag => (
                          <span key={tag} className="text-[11px] uppercase tracking-wide px-3 py-1 rounded-full bg-white/5 border border-white/5 text-white/70 group-hover:bg-white/10 group-hover:border-white/20 transition-colors">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.article>
                ))}
              </motion.div>
            </section>
          </div>
        </div>
      </div >

      <Footer />
    </>
  );
}
