"use client"

import Database from "../core/infra/database";

export default function Login() {
	async function handleChange(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		const formEl = e.currentTarget
		const form = new FormData(formEl);
		const db = await Database.getInstance()


		const data = {
			username: form.get('username'),
			age: Number(form.get('age')),
			height: Number(form.get('height')),
			weight: Number(form.get('weight')),
			sex: form.get('sex'),
		}

		try {
			await db.addToObjectStore("users", data)
			alert(`Created user: ${data.username}`)
		} catch (e) {
			alert(`error while creating user: ${e}`)
		}

		formEl.reset()

	}
	return <div className="min-h-screen flex items-center justify-center bg-black-100">
		<form className="bg-white rounded-xl shadow-md p-6 w-full max-w-md space-y-4" onSubmit={handleChange}>
			<h1 className="text-black font-semibold text-xl text-center">Create user</h1>
			<input
				placeholder="username"
				className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
				name="username"
			/>
			<input
				placeholder="age"
				type="number"
				className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
				name="age"
			/>
			<input
				placeholder="height"
				type="number"
				className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
				name="height"
			/>
			<input
				placeholder="weight"
				type="number"
				className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
				name="weight"
			/>
			<select
				className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
				name="sex"
			>
				<option value="MALE">MALE</option>
				<option value="FEMALE">FEMALE</option>
			</select>

			<button
				className="w-full border rounded bg-gray-100 text-black cursor-pointer hover:bg-gray-300 active:scale-95 transition"
				type="submit"
			>
				Register
			</button>
		</form>
	</div>
}
