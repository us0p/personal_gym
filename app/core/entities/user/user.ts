enum SexOptions {
	MALE = 'MALE',
	FEMALE = 'FEMALE'
}

class User {
	public username: string
	public sex: SexOptions
	public birthDate: Date
	public height: number

	constructor(username: string, sex: SexOptions, birthDate: Date, height: number) {
		this.username = username;
		this.sex = sex;
		this.birthDate = birthDate;
		this.height = height;
	}
}

export {
	User,
	SexOptions
}
