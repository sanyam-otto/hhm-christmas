'use client';

import Image from 'next/image';

export default function Scene3D() {
    return (
        <div className="relative mx-auto w-full overflow-hidden rounded-[32px] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.15)]">
            <div className="flex items-center justify-center px-6 py-8 sm:px-10">
                <Image
                    src="/santa-claus.gif"
                    alt="Animated Santa waving at you."
                    width={520}
                    height={520}
                    priority
                    unoptimized
                    draggable={false}
                    className="h-auto w-full max-w-[420px] select-none object-contain"
                />
            </div>
            <div className="pointer-events-none absolute inset-x-12 bottom-6 h-16 rounded-full bg-black/5 blur-[50px]" aria-hidden />
        </div>
    );
}
