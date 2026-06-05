enum SexOptions {
	MALE = 'MALE',
	FEMALE = 'FEMALE',
}

interface User {
	username: string;
	sex: SexOptions;
	birthDate: Date;
	height: number;
	locale?: string;
	strike: number;
	maxStrike: number;
}

export { SexOptions };
export type { User };
