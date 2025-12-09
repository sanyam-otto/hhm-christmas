'use client';

import { motion } from 'framer-motion';
import { Snowflake, Gift, Star } from 'lucide-react';
import { useState } from 'react';
import CanvasSnow from './CanvasSnow';

export default function LandingPage({ onEnter }: { onEnter: () => void }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden text-center z-10 font-sans selection:bg-yellow-pop selection:text-candy-red bg-gradient-to-b from-[#020617] via-[#1a1a2e] to-[#0f172a]">

            {/* Canvas Snowfall */}
            <CanvasSnow />

            {/* Main Content Container - Card Style */}
            <div className="relative z-20 flex flex-col items-center p-8 md:p-16 backdrop-blur-md rounded-[3rem] border-4 border-white/20 bg-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-2xl w-full mx-4 animate-float">

                {/* Decorative Top Badge */}
                <div className="absolute -top-10 bg-candy-red text-white py-2 px-8 rounded-full shadow-lg border-4 border-white transform -rotate-2">
                    <span className="font-bold text-xl tracking-widest uppercase">North Pole Link</span>
                </div>

                {/* Title Area */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", bounce: 0.5, duration: 1 }}
                    className="mb-12 mt-4"
                >
                    <h1 className="text-7xl md:text-9xl font-bold text-white drop-shadow-[0_4px_0_#00cc66] stroke-black" style={{ WebkitTextStroke: '2px rgba(0,0,0,0.2)' }}>
                        Santa&apos;s <br />
                        <span className="text-yellow-pop drop-shadow-[0_4px_0_#ff3366]">Helper</span>
                    </h1>
                    <p className="mt-6 text-2xl text-ice-blue font-bold tracking-wider animate-pulse">
                        Are you ready to talk?
                    </p>
                </motion.div>

                {/* Big Play Button */}
                <motion.button
                    onClick={onEnter}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    whileHover={{ scale: 1.1, rotate: [-1, 1, -1] }}
                    whileTap={{ scale: 0.9 }}
                    className="group relative px-12 py-8 bg-elf-green rounded-[2rem] border-b-8 border-[#00994d] active:border-b-0 active:translate-y-2 transition-all shadow-2xl"
                >
                    <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />

                    <span className="relative z-10 flex items-center gap-4 text-3xl md:text-4xl font-black text-white drop-shadow-md">
                        <Star className={`w-10 h-10 text-yellow-pop ${isHovered ? 'animate-spin' : ''}`} fill="currentColor" />
                        START
                        <Gift className={`w-10 h-10 text-candy-red ${isHovered ? 'animate-bounce' : ''}`} />
                    </span>
                </motion.button>
            </div>

            {/* Decorative Footer Characters */}
            <div className="absolute bottom-0 w-full flex justify-between px-4 opacity-50 pointer-events-none">
                <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                    <Snowflake className="w-24 h-24 text-ice-blue/20" />
                </motion.div>
                <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 4, repeat: Infinity, delay: 1 }}>
                    <Snowflake className="w-32 h-32 text-white/10" />
                </motion.div>
            </div>

        </div>
    );
}
