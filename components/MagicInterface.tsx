'use client';

import { motion } from 'framer-motion';
import { Mic, MicOff, Radio } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import Scene3D from './Scene3D';

// Web Speech API type definitions
interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognitionResult {
    isFinal: boolean;
    [index: number]: SpeechRecognitionAlternative;
    length: number;
}

interface SpeechRecognitionResultList {
    [index: number]: SpeechRecognitionResult;
    length: number;
}

interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognition;

const getSpeechRecognitionConstructor = (): SpeechRecognitionConstructor | null => {
    if (typeof window === 'undefined') return null;
    const withPref = window as typeof window & { 
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    return withPref.SpeechRecognition || withPref.webkitSpeechRecognition || null;
};

const isWakeWord = (transcript: string): boolean => {
    const t = transcript.toLowerCase();
    const compact = t.replace(/\s+/g, '');
    if (t.includes('santa') || compact.includes('heysanta')) return true;
    if (t.includes('sanya') || compact.includes('heysanya')) return true;
    if (t.includes('center') || t.includes('centre')) return true; // common mis-hear for santa
    if (t.includes('here santa') || t.includes('hair santa')) return true;
    return false;
};

export default function MagicInterface() {
    const [agentId] = useState(() => {
        if (typeof window === 'undefined') return 'agent_3901kc0mrg09f83ap5yznxdp160q';
        return localStorage.getItem('hhm_agent_id') || 'agent_3901kc0mrg09f83ap5yznxdp160q';
    });
    const [micPermissionGranted, setMicPermissionGranted] = useState(false);
    const [isListeningForWakeWord, setIsListeningForWakeWord] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const conversation = useConversation({
        apiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY,
        onConnect: () => {
            console.log('Connected to ElevenLabs');
            setIsListeningForWakeWord(false); // Stop wake word listening when connected
        },
        onDisconnect: () => {
            console.log('Disconnected from ElevenLabs');
            if (recognitionRef.current) recognitionRef.current.stop();
            setIsListeningForWakeWord(false);
            // Add small delay before allowing reconnection to show loading state
            setTimeout(() => {
                setIsDisconnecting(false);
            }, 500);
        },
        onMessage: (message) => console.log('Message received:', message),
        onError: (error) => {
            console.error('ElevenLabs Error:', error);
            setErrorMsg(`Connection error: ${error}`);
        },
    });

    const { status, isSpeaking } = conversation;
    const isConnected = status === 'connected';
    const isConnecting = status === 'connecting';
    const statusRef = useRef({ isConnected, isConnecting });

    // Debug: log conversation object and status
    useEffect(() => {
        console.log('Conversation status:', status, 'isConnected:', isConnected, 'isConnecting:', isConnecting);
        console.log('Conversation object methods:', {
            startSession: typeof conversation.startSession,
            endSession: typeof conversation.endSession
        });
    }, [status, isConnected, isConnecting, conversation]);

    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const sessionStartInFlightRef = useRef(false);
    const wakeWordDetectedRef = useRef(false);
    const lastRestartTimeRef = useRef<number>(0);
    useEffect(() => {
        statusRef.current = { isConnected, isConnecting };
    }, [isConnected, isConnecting]);

    const [errorMsg, setErrorMsg] = useState('');

    const requestMicPermission = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            setMicPermissionGranted(true);
            return true;
        } catch (micError) {
            console.error('Microphone permission denied:', micError);
            setErrorMsg('Please allow microphone access to talk to Santa!');
            setMicPermissionGranted(false);
            return false;
        }
    }, []);

    const toggleConnection = useCallback(async () => {
        try {
            console.log('toggleConnection called, isConnected:', isConnected, 'sessionInFlight:', sessionStartInFlightRef.current);
            setErrorMsg('');
            if (sessionStartInFlightRef.current) {
                console.log('Session start already in flight, ignoring...');
                return;
            }
            if (isConnected) {
                // User is turning the mic OFF explicitly
                setIsDisconnecting(true);
                setIsListeningForWakeWord(false);
                if (recognitionRef.current) {
                    try {
                        recognitionRef.current.stop();
                    } catch (e) {
                        console.error('Failed to stop wake word recognition on disconnect', e);
                    }
                    recognitionRef.current = null;
                }
                await conversation.endSession();
                // Wake word listener will auto-restart via useEffect after delay
            } else {
                // If permission not yet granted, request it first
                console.log('Checking mic permission, granted:', micPermissionGranted);
                if (!micPermissionGranted) {
                    console.log('Requesting mic permission...');
                    const granted = await requestMicPermission();
                    console.log('Mic permission granted:', granted);
                    if (!granted) return;
                    // Continue to start session if granted
                }

                console.log('Checking agentId:', agentId);
                if (!agentId) {
                    setErrorMsg('Missing Agent ID. Please add it and try again.');
                    return;
                }

                if (recognitionRef.current) {
                    console.log('Stopping wake word listener before session start');
                    recognitionRef.current.stop();
                }
                setIsListeningForWakeWord(false);

                sessionStartInFlightRef.current = true;
                console.log('About to call startSession with config:', { agentId });
                try {
                    // @ts-expect-error SDK types mismatch for startSession
                    const result = await conversation.startSession({ agentId });
                    console.log('Session started successfully, result:', result);
                } catch (sessionError) {
                    console.error('startSession failed:', sessionError);
                    throw sessionError;
                }
            }
        } catch (err: unknown) {
            console.error('Connection failed:', err);
            const message = err instanceof Error ? err.message : String(err);
            // Verify if it's a permission error that happened during connection
            if (message.includes('NotAllowedError') || message.includes('Permission denied')) {
                setMicPermissionGranted(false);
                setErrorMsg('Microphone access was denied. Please allow it in settings.');
            } else {
                setErrorMsg(message || 'Failed to connect. Is the Agent ID correct?');
            }
        } finally {
            sessionStartInFlightRef.current = false;
            // Reset disconnecting state in case of error
            if (isDisconnecting) {
                setIsDisconnecting(false);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [agentId, conversation, isConnected, micPermissionGranted, requestMicPermission]);

    const startWakeWordListener = useCallback(() => {
        // Don't start wake word listener on mobile devices
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobileDevice) {
            console.log('Wake word listener disabled on mobile - use button instead');
            return;
        }
        
        const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
        if (!SpeechRecognitionCtor) {
            console.error('Speech Recognition not available.');
            return;
        }
        if (sessionStartInFlightRef.current) return;
        if (recognitionRef.current) return;
        
        // Prevent starting too quickly (debounce restarts)
        const now = Date.now();
        if (now - lastRestartTimeRef.current < 1000) {
            console.log('Throttling wake word listener restart (too soon)');
            return;
        }
        lastRestartTimeRef.current = now;

        const recognition = new SpeechRecognitionCtor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    const transcript = event.results[i][0].transcript.toLowerCase();
                    console.log('Heard:', transcript);
                    if (isWakeWord(transcript)) {
                        console.log('Wake word detected!');
                        // Stop recognition before connecting to prevent conflicts
                        wakeWordDetectedRef.current = true;
                        recognition.stop();
                        // Small delay to allow recognition to fully stop
                        setTimeout(() => {
                            const { isConnected: connectedNow, isConnecting: connectingNow } = statusRef.current;
                            if (!connectedNow && !connectingNow && !sessionStartInFlightRef.current) {
                                console.log('Initiating connection from wake word...');
                                toggleConnection();
                            }
                            wakeWordDetectedRef.current = false;
                        }, 200);
                    }
                }
            }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.log("Speech recognition error", event.error);
            // If not-allowed, update state
            if (event.error === 'not-allowed') {
                setMicPermissionGranted(false);
            }
            // Only set listening to false if it's not an aborted error (which is normal)
            if (event.error !== 'aborted') {
                setIsListeningForWakeWord(false);
            }
        };

        recognition.onend = () => {
            console.log("Recognition ended, wakeWordDetected:", wakeWordDetectedRef.current, "sessionInFlight:", sessionStartInFlightRef.current);
            setIsListeningForWakeWord(false);
            // Clear the ref after a small delay to avoid race conditions
            setTimeout(() => {
                if (recognitionRef.current === recognition) {
                    recognitionRef.current = null;
                }
            }, 100);
        };

        try {
            recognition.start();
            setIsListeningForWakeWord(true);
            recognitionRef.current = recognition;
            // If wake word listener starts successfully, mic permission must be granted
            setMicPermissionGranted(true);
            console.log("Wake word listener started");
        } catch (e) {
            console.error('Failed to start recognition', e);
        }
    }, [toggleConnection]);

    // Ensure wake word resumes whenever we're idle and have mic access
    useEffect(() => {
        if (!isConnected && !isConnecting && !isDisconnecting && micPermissionGranted && !isListeningForWakeWord && !sessionStartInFlightRef.current && !wakeWordDetectedRef.current) {
            if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
            restartTimeoutRef.current = setTimeout(() => {
                restartTimeoutRef.current = null;
                if (!wakeWordDetectedRef.current && !isDisconnecting && !sessionStartInFlightRef.current) {
                    console.log('Auto-restarting wake word listener...');
                    startWakeWordListener();
                }
            }, 500); // Increased delay to 500ms to prevent rapid restarts
        } else if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
            restartTimeoutRef.current = null;
        }
    }, [isConnected, isConnecting, isDisconnecting, isListeningForWakeWord, micPermissionGranted, startWakeWordListener]);

    // Auto-request Mic on Mount
    useEffect(() => {
        // Check for mobile device
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        setIsMobile(isMobileDevice);
        
        // Check for browser compatibility (just log, don't show error on mobile)
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        
        if (isIOS && isSafari) {
            console.warn('iOS Safari detected - Web Speech API not supported');
            // Don't show error banner on mobile - we already have mobile-friendly UI
        }
        
        // Check if using HTTP on non-localhost (just log, don't show error on mobile)
        if (typeof window !== 'undefined' && window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
            console.warn('HTTP detected on non-localhost - microphone access may be blocked');
            // Don't show error banner on mobile - we already have mobile-friendly UI
        }

        requestMicPermission().then((granted) => {
            if (granted && !isMobileDevice) {
                // Only start wake word listener on desktop
                startWakeWordListener();
            }
        });

        return () => {
            if (recognitionRef.current) recognitionRef.current.stop();
            if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
        };
    }, [requestMicPermission, startWakeWordListener]);

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
                {!isConnected && !isConnecting && !isDisconnecting && (
                    <div className="w-full text-center animate-bounce-slow">
                        {isMobile ? (
                            <>
                                <h2 className="mb-2 text-2xl font-black tracking-wide text-[#0f172a] drop-shadow-sm sm:text-4xl">
                                    Ready to Chat?
                                </h2>
                                <p className="text-lg font-medium text-[#475569]">
                                    Tap the button to talk to Santa
                                </p>
                            </>
                        ) : (
                            <>
                                <h2 className="mb-2 text-2xl font-black tracking-wide text-[#0f172a] drop-shadow-sm sm:text-4xl">
                                    Say &quot;Hey Santa&quot;
                                </h2>
                                <p className="text-lg font-medium text-[#475569]">
                                    or tap the button below
                                </p>
                            </>
                        )}
                    </div>
                )}
            </section>

            {/* Controls Footer - Centered */}
            <div className="flex w-full flex-col items-center justify-center pb-4 gap-4">
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleConnection}
                    disabled={isConnecting || isDisconnecting}
                    className={`relative z-10 flex h-24 w-24 items-center justify-center rounded-full transition-all duration-500 shadow-2xl sm:h-28 sm:w-28 ${isConnected
                        ? 'bg-red-500 hover:bg-red-600 shadow-red-500/50'
                        : (isConnecting || isDisconnecting)
                            ? 'bg-yellow-500 shadow-yellow-500/50 animate-pulse'
                            : 'bg-green-600 hover:bg-green-500 shadow-green-600/50'
                        } ${!micPermissionGranted ? 'ring-2 ring-offset-2 ring-yellow-300' : ''}`}
                >
                    {isConnected ? (
                        <MicOff className="h-10 w-10 text-white sm:h-12 sm:w-12" />
                    ) : (isConnecting || isDisconnecting) ? (
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
