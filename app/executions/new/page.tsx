'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ExecutionNewRedirect() {
	const router = useRouter();
	useEffect(() => { router.replace('/workouts'); }, [router]);
	return null;
}
