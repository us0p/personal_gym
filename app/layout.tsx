import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { UserProvider } from "./context/user-context";
import { TimerProvider } from "./context/timer-context";
import Nav from "./components/nav";
import TimerBanner from "./components/timer-banner";
import SwRegister from "./components/sw-register";
import PwaInstallButton from "./components/pwa-install-button";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Personal Gym",
	description: "Track your training and evolution",
};

export const viewport: Viewport = {
	themeColor: "#000000",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className={`${geistSans.variable} h-full`}>
			<body className="bg-black text-white min-h-full antialiased">
				<PwaInstallButton />
				<UserProvider>
					<TimerProvider>
						<TimerBanner />
						<div className="pb-16">{children}</div>
						<Nav />
					</TimerProvider>
				</UserProvider>
				<SwRegister />
			</body>
		</html>
	);
}
