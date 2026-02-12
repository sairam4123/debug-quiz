"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#14B8A6", "#06B6D4", "#F59E0B", "#10B981", "#0EA5E9", "#F43F5E", "#EAB308"];

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    rotation: number;
    rotSpeed: number;
    opacity: number;
    shape: "square" | "circle" | "strip";
}

export function Confetti({ active = true, duration = 4000 }: { active?: boolean; duration?: number }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!active) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener("resize", resize);

        const particles: Particle[] = [];
        const shapes: Particle["shape"][] = ["square", "circle", "strip"];

        // Create particles in bursts
        const createBurst = (count: number) => {
            for (let i = 0; i < count; i++) {
                const angle = (Math.random() * Math.PI * 2);
                const speed = 4 + Math.random() * 12;
                particles.push({
                    x: canvas.width * (0.2 + Math.random() * 0.6),
                    y: canvas.height * 0.3 + Math.random() * canvas.height * 0.2,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 6,
                    color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
                    size: 4 + Math.random() * 6,
                    rotation: Math.random() * 360,
                    rotSpeed: (Math.random() - 0.5) * 12,
                    opacity: 1,
                    shape: shapes[Math.floor(Math.random() * shapes.length)]!,
                });
            }
        };

        // Initial burst
        createBurst(80);
        // Delayed bursts
        const t1 = setTimeout(() => createBurst(50), 300);
        const t2 = setTimeout(() => createBurst(40), 700);
        const t3 = setTimeout(() => createBurst(30), 1200);

        let animId: number;
        const startTime = Date.now();

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const elapsed = Date.now() - startTime;
            const fadeStart = duration * 0.6;

            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.15; // gravity
                p.vx *= 0.99; // air resistance
                p.rotation += p.rotSpeed;

                // Fade out near end
                if (elapsed > fadeStart) {
                    p.opacity = Math.max(0, 1 - (elapsed - fadeStart) / (duration - fadeStart));
                }

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.globalAlpha = p.opacity;
                ctx.fillStyle = p.color;

                if (p.shape === "square") {
                    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                } else if (p.shape === "circle") {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.fillRect(-p.size / 4, -p.size, p.size / 2, p.size * 2);
                }

                ctx.restore();
            }

            if (elapsed < duration) {
                animId = requestAnimationFrame(animate);
            }
        };

        animId = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animId);
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
            window.removeEventListener("resize", resize);
        };
    }, [active, duration]);

    if (!active) return null;

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-[100] pointer-events-none"
            style={{ width: "100vw", height: "100vh" }}
        />
    );
}
