enum SexOptions {
	MALE = 'MALE',
	FEMALE = 'FEMALE'
}

class User {
	public username: string
	public sex: SexOptions
	public age: number
	public weight: number
	public height: number

	constructor(username: string, sex: SexOptions, age: number, weight: number, height: number) {
		this.username = username;
		this.sex = sex;
		this.age = age;
		this.weight = weight;
		this.height = height;
	}
}

export {
	User,
	SexOptions
}
