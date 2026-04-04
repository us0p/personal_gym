enum SexOptions {
	MALE = 'MALE',
	FEMALE = 'FEMALE',
}

interface User {
	username: string;
	sex: SexOptions;
	birthDate: Date;
	height: number;
}

export { SexOptions };
export type { User };
