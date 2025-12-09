'use client';

import { useEffect, useRef } from 'react';

interface Snowflake {
    x: number;
    y: number;
    radius: number;
    speed: number;
    wind: number;
    opacity: number;
}

export default function CanvasSnow() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let snowflakes: Snowflake[] = [];

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        const createSnowflakes = () => {
            const count = Math.floor((window.innerWidth * window.innerHeight) / 10000); // Density
            snowflakes = [];
            for (let i = 0; i < count; i++) {
                snowflakes.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    radius: Math.random() * 3 + 1,
                    speed: Math.random() * 1 + 0.5,
                    wind: Math.random() * 0.5 - 0.25,
                    opacity: Math.random() * 0.5 + 0.3,
                });
            }
        };

        const drawSnowflakes = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw Gradient Background directly on canvas for smoothness
            // Or keep transparent if we use CSS bg. Let's keep transparent/interaction.

            snowflakes.forEach((flake) => {
                ctx.beginPath();
                ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${flake.opacity})`;
                ctx.fill();

                // Update position
                flake.y += flake.speed;
                flake.x += flake.wind;

                // Reset if out of bounds
                if (flake.y > canvas.height) {
                    flake.y = -flake.radius;
                    flake.x = Math.random() * canvas.width;
                }
                if (flake.x > canvas.width) {
                    flake.x = 0;
                } else if (flake.x < 0) {
                    flake.x = canvas.width;
                }
            });

            animationFrameId = requestAnimationFrame(drawSnowflakes);
        };

        resizeCanvas();
        createSnowflakes();
        drawSnowflakes();

        window.addEventListener('resize', () => {
            resizeCanvas();
            createSnowflakes();
        });

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 z-0 pointer-events-none"
        />
    );
}
