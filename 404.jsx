import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Head from 'next/head'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faSearch } from '@fortawesome/free-solid-svg-icons';

export default function Custom404() {
  // Using a space-themed or abstract image for the background
  const bannerSrc = "https://i.postimg.cc/g0M89Nv2/Banner.png"; // Reusing the dark banner from About for consistency

  return (
    <>
      <Head>
        <title>404 - Səhifə Tapılmadı | Tengoku Fansub</title>
        <meta name="description" content="Axtardığınız səhifə mövcud deyil." />
      </Head>
      <Navbar />

      <div className="relative min-h-screen bg-black text-white selection:bg-netflix-blue selection:text-white overflow-hidden flex flex-col">
        {/* Background Parallax-like Effect - Copied from About page */}
        <div aria-hidden="true" className="fixed inset-0 pointer-events-none z-0">
          <div
            className="absolute inset-0 bg-center bg-cover bg-no-repeat opacity-40 scale-105 blur-md"
            style={{ backgroundImage: `url(${bannerSrc})` }}
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />

          {/* Extra atmospheric glow for 404 */}
          <div className="absolute top-[-10%] left-[-10%] w-1/2 h-1/2 bg-green-300/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-1/2 h-1/2 bg-netflix-blue-100/10 rounded-full blur-[100px]" />
        </div>

        <main className="relative z-10 flex-grow flex items-center justify-center container mx-auto px-4 lg:px-8 pb-40 pt-60">

          <div className="max-w-3xl w-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-16 text-center shadow-2xl relative overflow-hidden group hover:border-white/20 transition-all duration-500"
            >
              {/* Glass sheen effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
              >
                <h1 className="text-8xl md:text-[10rem] font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-gray-400 to-gray-600 drop-shadow-2xl mb-2 select-none">
                  404
                </h1>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.8 }}
              >
                <h2 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-netflix-blue-100 to-green-300 bg-clip-text text-transparent mb-6">
                  Ölçülər arası boşluqdasınız?
                </h2>
                <p className="text-lg text-gray-400 leading-relaxed max-w-lg mx-auto mb-10 font-light">
                  Axtardığınız anime bu dünyada (və ya serverdə) mövcud deyil. <br className="hidden sm:block" />
                  Səhv keçidə daxil olmusunuz, ya da biz onu başqa bir reallığa göndərmişik.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Link
                  href="/"
                  className="px-8 py-3.5 rounded-full bg-white text-black font-bold hover:bg-gray-200 transition-all duration-300 shadow-lg hover:scale-105 active:scale-95 flex items-center gap-2 group/btn"
                >
                  <FontAwesomeIcon icon={faHome} />
                  <span>Ana Səhifə</span>
                </Link>
              </motion.div>

            </motion.div>
          </div>

        </main>
        <Footer />
      </div>
    </>
  )
}