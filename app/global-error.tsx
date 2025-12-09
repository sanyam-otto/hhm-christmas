'use client';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body className="flex items-center justify-center min-h-screen bg-black text-white p-8">
                <div className="max-w-md text-center">
                    <h2 className="text-2xl font-bold text-red-500 mb-4">Something went wrong!</h2>
                    <p className="bg-white/10 p-4 rounded text-left font-mono text-sm overflow-auto mb-6">
                        {error.name}: {error.message}
                    </p>
                    <button
                        onClick={() => reset()}
                        className="px-6 py-2 bg-blue-600 rounded hover:bg-blue-500"
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    );
}
