import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { UserProvider } from "./context/user-context";
import Nav from "./components/nav";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Personal Gym",
	description: "Track your training and evolution",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className={`${geistSans.variable} h-full`}>
			<body className="bg-black text-white min-h-full antialiased">
				<UserProvider>
					<div className="pb-16">{children}</div>
					<Nav />
				</UserProvider>
			</body>
		</html>
	);
}
