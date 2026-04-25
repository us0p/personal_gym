'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

interface Toast {
	id: number;
	message: string;
	leaving: boolean;
}

interface ToastContextType {
	toast: (message: string) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<Toast[]>([]);

	const toast = useCallback((message: string) => {
		const id = ++nextId;
		setToasts((prev) => [...prev, { id, message, leaving: false }]);
	}, []);

	useEffect(() => {
		if (toasts.length === 0) return;
		const latest = toasts[toasts.length - 1];
		if (latest.leaving) return;

		const enterTimer = setTimeout(() => {
			setToasts((prev) =>
				prev.map((t) => (t.id === latest.id ? { ...t, leaving: true } : t)),
			);
		}, 3000);

		const exitTimer = setTimeout(() => {
			setToasts((prev) => prev.filter((t) => t.id !== latest.id));
		}, 3400);

		return () => {
			clearTimeout(enterTimer);
			clearTimeout(exitTimer);
		};
	}, [toasts]);

	return (
		<ToastContext.Provider value={{ toast }}>
			{children}
			<div className="fixed bottom-20 left-0 right-0 flex flex-col items-center gap-2 pointer-events-none z-50 px-4">
				{toasts.map((t) => (
					<div
						key={t.id}
						className={`bg-zinc-800 text-white text-sm font-medium rounded-2xl px-5 py-3.5 shadow-lg max-w-sm w-full text-center transition-all duration-300 ${
							t.leaving ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
						}`}
					>
						{t.message}
					</div>
				))}
			</div>
		</ToastContext.Provider>
	);
}

export function useToast() {
	return useContext(ToastContext);
}
