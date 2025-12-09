'use client';

import { motion } from 'framer-motion';
import { Mic, MicOff, Volume2, Sparkles, Settings, Radio } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import Scene3D from './Scene3D';

export default function MagicInterface() {
    const [agentId, setAgentId] = useState('agent_3901kc0mrg09f83ap5yznxdp160q');
    const [showSettings, setShowSettings] = useState(false);
    const [micPermissionGranted, setMicPermissionGranted] = useState(false);
    const [isListeningForWakeWord, setIsListeningForWakeWord] = useState(false);

    const conversation = useConversation({
        onConnect: () => {
            console.log('Connected');
            setIsListeningForWakeWord(false); // Stop wake word listening when connected
        },
        onDisconnect: () => {
            console.log('Disconnected');
            // User requested "turn off mic" behavior:
            // Do NOT auto-restart wake word listener immediately.
            // Also mark mic permission as "off" so the wake-word engine does NOT
            // auto-restart from the onend handler. The user will explicitly
            // re-enable the mic on the next tap.
            setMicPermissionGranted(false);
            if (recognitionRef.current) recognitionRef.current.stop();
            setIsListeningForWakeWord(false);
        },
        onMessage: (message) => console.log('Message:', message),
        onError: (error) => console.error('Error:', error),
    });

    const { status, isSpeaking } = conversation;
    const isConnected = status === 'connected';
    const isConnecting = status === 'connecting';

    const recognitionRef = useRef<any>(null);

    const [errorMsg, setErrorMsg] = useState('');

    const toggleConnection = useCallback(async () => {
        try {
            setErrorMsg('');
            if (isConnected) {
                // User is turning the mic OFF explicitly
                setIsListeningForWakeWord(false);
                if (recognitionRef.current) {
                    try {
                        recognitionRef.current.stop();
                    } catch (e) {
                        console.error('Failed to stop wake word recognition on disconnect', e);
                    }
                }
                await conversation.endSession();
            } else {
                // If permission not yet granted, ask for it
                if (!micPermissionGranted) {
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        stream.getTracks().forEach(track => track.stop());
                        setMicPermissionGranted(true);
                        // Small delay to ensure state updates if needed, though state is async
                    } catch (micError) {
                        console.error('Microphone permission denied:', micError);
                        setErrorMsg('Please allow microphone access to talk to Santa!');
                        setMicPermissionGranted(false);
                        return;
                    }
                }

                if (!agentId) {
                    setShowSettings(true);
                    return;
                }

                if (recognitionRef.current) recognitionRef.current.stop(); // Stop wake word listener
                setIsListeningForWakeWord(false);

                // @ts-expect-error SDK types mismatch for startSession
                await conversation.startSession({ agentId });
            }
        } catch (err: any) {
            console.error('Connection failed:', err);
            // Verify if it's a permission error that happened during connection
            if (err?.message?.includes('NotAllowedError') || err?.message?.includes('Permission denied')) {
                setMicPermissionGranted(false);
                setErrorMsg('Microphone access was denied. Please allow it in settings.');
            } else {
                setErrorMsg(err?.message || 'Failed to connect. Is the Agent ID correct?');
            }
        }
    }, [isConnected, agentId, conversation, micPermissionGranted]);

    const startWakeWordListener = useCallback(() => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;

        // @ts-expect-error SpeechRecognition types
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        // Prevent multiple instances
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) { }
            recognitionRef.current = null;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    const transcript = event.results[i][0].transcript.toLowerCase();
                    console.log('Heard:', transcript);
                    if (transcript.includes('santa') || transcript.includes('hello')) {
                        console.log('Wake word detected!');
                        // Stop recognition before connecting to prevent conflicts
                        recognition.stop();
                        toggleConnection();
                    }
                }
            }
        };

        recognition.onerror = (event: any) => {
            console.log("Speech recognition error", event.error);
            // If not-allowed, update state
            if (event.error === 'not-allowed') {
                setMicPermissionGranted(false);
            }
        };

        recognition.onend = () => {
            console.log("Recognition ended");
            // Only restart if we are NOT connected and NOT connecting
            // And use a small timeout to prevent rapid loops
            if (!isConnected && !isConnecting && micPermissionGranted) {
                console.log("Restarting recognition...");
                setTimeout(() => {
                    try { recognition.start(); } catch (e) { console.error("Restart failed", e); }
                }, 500);
            }
        };

        try {
            recognition.start();
            setIsListeningForWakeWord(true);
            recognitionRef.current = recognition;
            console.log("Wake word listener started");
        } catch (e) {
            console.error('Failed to start recognition', e);
        }
    }, [isConnected, isConnecting, micPermissionGranted, toggleConnection]); // Add micPermissionGranted dependence

    // Auto-request Mic on Mount
    useEffect(() => {
        // Attempt to load from localStorage
        const savedId = localStorage.getItem('hhm_agent_id');
        if (savedId) setAgentId(savedId);

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then((stream) => {
                setMicPermissionGranted(true);
                stream.getTracks().forEach(t => t.stop()); // Permission granted, stop stream
                startWakeWordListener();
            })
            .catch((err) => {
                console.error('Mic permission denied initially', err);
                setMicPermissionGranted(false);
            });

        return () => {
            if (recognitionRef.current) recognitionRef.current.stop();
        };
    }, [startWakeWordListener]);

    return (
        <div className="relative mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center gap-6 px-4 py-8 sm:px-8 font-sans text-center">

            {/* Header - placeholder for potential controls */}
            <header className="w-full flex justify-end items-center">
                {/* Clean header */}
            </header>

            {/* Error Banner - Click to dismiss/retry */}
            {errorMsg && (
                <div
                    onClick={() => { setErrorMsg(''); toggleConnection(); }}
                    className="cursor-pointer w-full max-w-md rounded-xl bg-red-500/90 p-4 text-center font-bold text-white shadow-lg animate-bounce hover:bg-red-400 transition-colors mx-auto"
                >
                    {errorMsg} <br /> <span className="text-sm font-normal underline">Tap to Retry</span>
                </div>
            )}

            <section className="flex w-full flex-1 flex-col items-center gap-8">
                <div className="relative mx-auto w-full max-w-2xl">
                    <Scene3D />

                    {/* Connected Status Text */}
                    {isConnected && (
                        <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
                            <div className="rounded-full bg-[#0f172a] px-6 py-3 text-white shadow-lg">
                                <h2 className="text-xl font-black tracking-wide sm:text-2xl">
                                    {isSpeaking ? "HO HO HO!" : "I'm Listening..."}
                                </h2>
                            </div>
                        </div>
                    )}
                </div>

                {/* Wake Word Prompt */}
                {!isConnected && !isConnecting && (
                    <div className="w-full text-center animate-bounce-slow">
                        <h2 className="mb-2 text-2xl font-black tracking-wide text-[#0f172a] drop-shadow-sm sm:text-4xl">
                            Say "Hey Santa"
                        </h2>
                        <p className="text-lg font-medium text-[#475569]">
                            or tap the button below
                        </p>
                    </div>
                )}
            </section>

            {/* Controls Footer - Centered */}
            <div className="flex w-full flex-col items-center justify-center pb-4 gap-4">
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleConnection}
                    disabled={isConnecting || !micPermissionGranted}
                    className={`relative z-10 flex h-24 w-24 items-center justify-center rounded-full transition-all duration-500 shadow-2xl sm:h-28 sm:w-28 ${isConnected
                        ? 'bg-red-500 hover:bg-red-600 shadow-red-500/50'
                        : isConnecting
                            ? 'bg-yellow-500 shadow-yellow-500/50 animate-pulse'
                            : 'bg-green-600 hover:bg-green-500 shadow-green-600/50'
                        } ${!micPermissionGranted ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                    {isConnected ? (
                        <MicOff className="h-10 w-10 text-white sm:h-12 sm:w-12" />
                    ) : isConnecting ? (
                        <Radio className="h-10 w-10 animate-spin text-white sm:h-12 sm:w-12" />
                    ) : (
                        <Mic className="h-10 w-10 text-white sm:h-12 sm:w-12" />
                    )}

                    {/* Ripples - only when wake word listener is actively running */}
                    {isListeningForWakeWord && !isConnected && !isConnecting && micPermissionGranted && (
                        <>
                            <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping opacity-20" />
                            <div className="absolute -inset-4 rounded-full border-2 border-white/10 animate-pulse opacity-40 delay-150" />
                        </>
                    )}

                    {/* Wake Word Active Indicator */}
                    {isListeningForWakeWord && !isConnected && (
                        <div className="absolute -inset-3 rounded-full border-4 border-yellow-400 animate-pulse opacity-60" />
                    )}
                </motion.button>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#94a3b8]">
                    Powered by Otto AI
                </p>
            </div>
        </div>
    );
}
