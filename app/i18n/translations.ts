const LOCALES = ['en', 'pt-BR'] as const;
type Locale = (typeof LOCALES)[number];

type TranslationDict = Record<string, string>;

const translations: Record<Locale, TranslationDict> = {
	en: {
		// Navigation
		'nav.home': 'Home',
		'nav.workouts': 'Workouts',
		'nav.exercises': 'Exercises',
		'nav.profile': 'Profile',

		// App
		'app.name': 'Personal Gym',

		// Language picker
		'lang.label': 'Language',
		'lang.en': 'EN',
		'lang.pt-BR': 'PT',

		// Common
		'common.loading': 'Loading…',
		'common.delete': 'Delete',
		'common.edit': 'Edit',
		'common.male': 'Male',
		'common.female': 'Female',

		// Home / Dashboard
		'home.welcome': 'Welcome',
		'home.greeting': 'Hey, {username}',

		// Profile view
		'profile.title': 'Profile',
		'profile.noProfile': 'No profile yet.',
		'profile.createProfile': 'Create Profile',
		'profile.export': 'Export',
		'profile.dbExport': 'Database Export',
		'profile.exportLoading': 'Loading…',
		'profile.username': 'Username',
		'profile.age': 'Age',
		'profile.ageValue': '{age} years',
		'profile.sex': 'Sex',
		'profile.height': 'Height',
		'profile.heightValue': '{height} cm',
		'profile.weight': 'Weight',
		'profile.weightValue': '{weight} kg',
		'profile.editProfile': 'Edit Profile',

		// Create profile
		'createProfile.title': 'Create Profile',
		'createProfile.usernamePlaceholder': 'Username',
		'createProfile.dateOfBirth': 'Date of Birth',
		'createProfile.heightPlaceholder': 'Height (cm)',
		'createProfile.weightPlaceholder': 'Weight (kg)',
		'createProfile.submit': 'Create Profile',
		'createProfile.alreadyExists': 'A profile already exists. Only one profile is allowed.',
		'createProfile.failed': 'Failed to create profile. Please try again.',

		// Edit profile
		'editProfile.title': 'Edit Profile',
		'editProfile.dateOfBirth': 'Date of Birth',
		'editProfile.heightPlaceholder': 'Height (cm)',
		'editProfile.weightPlaceholder': 'Weight (kg)',
		'editProfile.submit': 'Save Changes',
		'editProfile.notFound': 'No profile found.',
		'editProfile.failed': 'Failed to save changes. Please try again.',
		'editProfile.deleteConfirm': 'Delete your profile? This cannot be undone.',

		// Workouts list
		'workouts.title': 'Workouts',
		'workouts.new': '+ New',
		'workouts.empty': 'No workouts yet. Create your first routine.',
		'workouts.exerciseCount_one': '{count} exercise',
		'workouts.exerciseCount_other': '{count} exercises',

		// New workout
		'newWorkout.title': 'New Workout',
		'newWorkout.namePlaceholder': 'Workout name',
		'newWorkout.daysOfWeek': 'Days of the Week',
		'newWorkout.exercises': 'Exercises',
		'newWorkout.noExercises': 'No exercises available.',
		'newWorkout.createExercise': 'Create an exercise first',
		'newWorkout.submit': 'Create Workout',
		'newWorkout.noProfile': 'No profile found. Please create a profile first.',
		'newWorkout.alreadyExists': 'A workout with this name already exists.',

		// Workout detail
		'workoutDetail.noExercises': 'No exercises in this workout yet.',
		'workoutDetail.addExercises': 'Add exercises',
		'workoutDetail.exercises': 'Exercises',

		// Edit workout
		'editWorkout.title': 'Edit Workout',
		'editWorkout.namePlaceholder': 'Workout name',
		'editWorkout.daysOfWeek': 'Days of the Week',
		'editWorkout.exercises': 'Exercises',
		'editWorkout.noExercises': 'No exercises available.',
		'editWorkout.submit': 'Save Changes',
		'editWorkout.alreadyExists': 'A workout with that name already exists.',
		'editWorkout.deleteConfirm': 'Delete "{name}"?',

		// Exercise log
		'exerciseLog.rest': 'Rest',
		'exerciseLog.skip': 'Skip',
		'exerciseLog.restAfterSet': 'Rest after set',
		'exerciseLog.min': 'Min',
		'exerciseLog.sec': 'Sec',
		'exerciseLog.logSession': 'Log Session',
		'exerciseLog.logSet': 'Log Set',
		'exerciseLog.durationPlaceholder': 'Duration (min)',
		'exerciseLog.repsPlaceholder': 'Reps',
		'exerciseLog.log': 'Log',
		'exerciseLog.speedAssistant': 'Start execution speed assistant',
		'exerciseLog.loggedSets': 'Logged Sets',
		'exerciseLog.minAbbr': 'min',
		'exerciseLog.reps': 'reps',

		// Exercises list
		'exercises.title': 'Exercises',
		'exercises.new': '+ New',
		'exercises.empty': 'No exercises yet. Add your first one.',
		'exercises.deleteConfirm': 'Delete "{name}"?',

		// New exercise
		'newExercise.title': 'New Exercise',
		'newExercise.namePlaceholder': 'Exercise name',
		'newExercise.type': 'Type',
		'newExercise.bodyRegion': 'Body Region',
		'newExercise.submit': 'Create Exercise',
		'newExercise.noBodyRegion': 'Select at least one body region.',
		'newExercise.alreadyExists': 'An exercise with this name already exists.',

		// Edit exercise
		'editExercise.title': 'Edit Exercise',
		'editExercise.namePlaceholder': 'Exercise name',
		'editExercise.submit': 'Save Changes',
		'editExercise.alreadyExists': 'An exercise with that name already exists.',
		'editExercise.deleteConfirm': 'Delete "{name}"?',

		// Charts
		'weightChart.title': 'Weight',
		'weightChart.noData': 'No data available yet',
		'weightChart.unit': '{value} kg',
		'exerciseChart.title': 'Volume',
		'exerciseChart.noData': 'No data available yet',
		'exerciseChart.unitMin': 'min',
		'exerciseChart.unitReps': 'reps',

		// Speed assistant
		'speedAssistant.back': '← Back',
		'speedAssistant.title': 'Speed Assistant',
		'speedAssistant.swingLabel': 'Seconds per swing (one side to the other)',
		'speedAssistant.start': 'Start',
		'speedAssistant.stop': 'Stop',

		// Exercise types
		'exerciseType.push': 'push',
		'exerciseType.pull': 'pull',
		'exerciseType.cardio': 'cardio',

		// Body regions
		'bodyRegion.Chest': 'Chest',
		'bodyRegion.Back': 'Back',
		'bodyRegion.Shoulders': 'Shoulders',
		'bodyRegion.Biceps': 'Biceps',
		'bodyRegion.Triceps': 'Triceps',
		'bodyRegion.Abs': 'Abs',
		'bodyRegion.Quads': 'Quads',
		'bodyRegion.Hamstrings': 'Hamstrings',
		'bodyRegion.Glutes': 'Glutes',
		'bodyRegion.Calves': 'Calves',

		// Week days short (used in labels/badges)
		'weekDay.Mon': 'Mon',
		'weekDay.Tue': 'Tue',
		'weekDay.Wed': 'Wed',
		'weekDay.Thu': 'Thu',
		'weekDay.Fri': 'Fri',
		'weekDay.Sat': 'Sat',
		'weekDay.Sun': 'Sun',

		// Week days long (used in detail views)
		'weekDayLong.MONDAY': 'Monday',
		'weekDayLong.TUESDAY': 'Tuesday',
		'weekDayLong.WEDNESDAY': 'Wednesday',
		'weekDayLong.THURSDAY': 'Thursday',
		'weekDayLong.FRIDAY': 'Friday',
		'weekDayLong.SATURDAY': 'Saturday',
		'weekDayLong.SUNDAY': 'Sunday',
	},
	'pt-BR': {
		// Navigation
		'nav.home': 'Início',
		'nav.workouts': 'Treinos',
		'nav.exercises': 'Exercícios',
		'nav.profile': 'Perfil',

		// App
		'app.name': 'Personal Gym',

		// Language picker
		'lang.label': 'Idioma',
		'lang.en': 'EN',
		'lang.pt-BR': 'PT',

		// Common
		'common.loading': 'Carregando…',
		'common.delete': 'Excluir',
		'common.edit': 'Editar',
		'common.male': 'Masculino',
		'common.female': 'Feminino',

		// Home / Dashboard
		'home.welcome': 'Bem-vindo',
		'home.greeting': 'Olá, {username}',

		// Profile view
		'profile.title': 'Perfil',
		'profile.noProfile': 'Nenhum perfil encontrado.',
		'profile.createProfile': 'Criar Perfil',
		'profile.export': 'Exportar',
		'profile.dbExport': 'Exportar Banco de Dados',
		'profile.exportLoading': 'Carregando…',
		'profile.username': 'Usuário',
		'profile.age': 'Idade',
		'profile.ageValue': '{age} anos',
		'profile.sex': 'Sexo',
		'profile.height': 'Altura',
		'profile.heightValue': '{height} cm',
		'profile.weight': 'Peso',
		'profile.weightValue': '{weight} kg',
		'profile.editProfile': 'Editar Perfil',

		// Create profile
		'createProfile.title': 'Criar Perfil',
		'createProfile.usernamePlaceholder': 'Usuário',
		'createProfile.dateOfBirth': 'Data de Nascimento',
		'createProfile.heightPlaceholder': 'Altura (cm)',
		'createProfile.weightPlaceholder': 'Peso (kg)',
		'createProfile.submit': 'Criar Perfil',
		'createProfile.alreadyExists': 'Um perfil já existe. Apenas um perfil é permitido.',
		'createProfile.failed': 'Falha ao criar perfil. Tente novamente.',

		// Edit profile
		'editProfile.title': 'Editar Perfil',
		'editProfile.dateOfBirth': 'Data de Nascimento',
		'editProfile.heightPlaceholder': 'Altura (cm)',
		'editProfile.weightPlaceholder': 'Peso (kg)',
		'editProfile.submit': 'Salvar Alterações',
		'editProfile.notFound': 'Nenhum perfil encontrado.',
		'editProfile.failed': 'Falha ao salvar alterações. Tente novamente.',
		'editProfile.deleteConfirm': 'Excluir seu perfil? Esta ação não pode ser desfeita.',

		// Workouts list
		'workouts.title': 'Treinos',
		'workouts.new': '+ Novo',
		'workouts.empty': 'Nenhum treino ainda. Crie sua primeira rotina.',
		'workouts.exerciseCount_one': '{count} exercício',
		'workouts.exerciseCount_other': '{count} exercícios',

		// New workout
		'newWorkout.title': 'Novo Treino',
		'newWorkout.namePlaceholder': 'Nome do treino',
		'newWorkout.daysOfWeek': 'Dias da Semana',
		'newWorkout.exercises': 'Exercícios',
		'newWorkout.noExercises': 'Nenhum exercício disponível.',
		'newWorkout.createExercise': 'Crie um exercício primeiro',
		'newWorkout.submit': 'Criar Treino',
		'newWorkout.noProfile': 'Nenhum perfil encontrado. Por favor, crie um perfil primeiro.',
		'newWorkout.alreadyExists': 'Já existe um treino com este nome.',

		// Workout detail
		'workoutDetail.noExercises': 'Nenhum exercício neste treino ainda.',
		'workoutDetail.addExercises': 'Adicionar exercícios',
		'workoutDetail.exercises': 'Exercícios',

		// Edit workout
		'editWorkout.title': 'Editar Treino',
		'editWorkout.namePlaceholder': 'Nome do treino',
		'editWorkout.daysOfWeek': 'Dias da Semana',
		'editWorkout.exercises': 'Exercícios',
		'editWorkout.noExercises': 'Nenhum exercício disponível.',
		'editWorkout.submit': 'Salvar Alterações',
		'editWorkout.alreadyExists': 'Já existe um treino com este nome.',
		'editWorkout.deleteConfirm': 'Excluir "{name}"?',

		// Exercise log
		'exerciseLog.rest': 'Descanso',
		'exerciseLog.skip': 'Pular',
		'exerciseLog.restAfterSet': 'Descanso após série',
		'exerciseLog.min': 'Min',
		'exerciseLog.sec': 'Seg',
		'exerciseLog.logSession': 'Registrar Sessão',
		'exerciseLog.logSet': 'Registrar Série',
		'exerciseLog.durationPlaceholder': 'Duração (min)',
		'exerciseLog.repsPlaceholder': 'Repetições',
		'exerciseLog.log': 'Registrar',
		'exerciseLog.speedAssistant': 'Iniciar assistente de velocidade',
		'exerciseLog.loggedSets': 'Séries Registradas',
		'exerciseLog.minAbbr': 'min',
		'exerciseLog.reps': 'reps',

		// Exercises list
		'exercises.title': 'Exercícios',
		'exercises.new': '+ Novo',
		'exercises.empty': 'Nenhum exercício ainda. Adicione o primeiro.',
		'exercises.deleteConfirm': 'Excluir "{name}"?',

		// New exercise
		'newExercise.title': 'Novo Exercício',
		'newExercise.namePlaceholder': 'Nome do exercício',
		'newExercise.type': 'Tipo',
		'newExercise.bodyRegion': 'Região do Corpo',
		'newExercise.submit': 'Criar Exercício',
		'newExercise.noBodyRegion': 'Selecione pelo menos uma região do corpo.',
		'newExercise.alreadyExists': 'Já existe um exercício com este nome.',

		// Edit exercise
		'editExercise.title': 'Editar Exercício',
		'editExercise.namePlaceholder': 'Nome do exercício',
		'editExercise.submit': 'Salvar Alterações',
		'editExercise.alreadyExists': 'Já existe um exercício com este nome.',
		'editExercise.deleteConfirm': 'Excluir "{name}"?',

		// Charts
		'weightChart.title': 'Peso',
		'weightChart.noData': 'Nenhum dado disponível ainda',
		'weightChart.unit': '{value} kg',
		'exerciseChart.title': 'Volume',
		'exerciseChart.noData': 'Nenhum dado disponível ainda',
		'exerciseChart.unitMin': 'min',
		'exerciseChart.unitReps': 'reps',

		// Speed assistant
		'speedAssistant.back': '← Voltar',
		'speedAssistant.title': 'Assistente de Velocidade',
		'speedAssistant.swingLabel': 'Segundos por oscilação (de um lado ao outro)',
		'speedAssistant.start': 'Iniciar',
		'speedAssistant.stop': 'Parar',

		// Exercise types
		'exerciseType.push': 'empurrar',
		'exerciseType.pull': 'puxar',
		'exerciseType.cardio': 'cardio',

		// Body regions
		'bodyRegion.Chest': 'Peito',
		'bodyRegion.Back': 'Costas',
		'bodyRegion.Shoulders': 'Ombros',
		'bodyRegion.Biceps': 'Bíceps',
		'bodyRegion.Triceps': 'Tríceps',
		'bodyRegion.Abs': 'Abdômen',
		'bodyRegion.Quads': 'Quadríceps',
		'bodyRegion.Hamstrings': 'Isquiotibiais',
		'bodyRegion.Glutes': 'Glúteos',
		'bodyRegion.Calves': 'Panturrilhas',

		// Week days short
		'weekDay.Mon': 'Seg',
		'weekDay.Tue': 'Ter',
		'weekDay.Wed': 'Qua',
		'weekDay.Thu': 'Qui',
		'weekDay.Fri': 'Sex',
		'weekDay.Sat': 'Sáb',
		'weekDay.Sun': 'Dom',

		// Week days long
		'weekDayLong.MONDAY': 'Segunda-feira',
		'weekDayLong.TUESDAY': 'Terça-feira',
		'weekDayLong.WEDNESDAY': 'Quarta-feira',
		'weekDayLong.THURSDAY': 'Quinta-feira',
		'weekDayLong.FRIDAY': 'Sexta-feira',
		'weekDayLong.SATURDAY': 'Sábado',
		'weekDayLong.SUNDAY': 'Domingo',
	},
};

function detectLocale(): Locale {
	if (typeof navigator === 'undefined') return 'en';
	const lang = navigator.language;
	if (lang.startsWith('pt')) return 'pt-BR';
	return 'en';
}

function interpolate(template: string, params: Record<string, string | number>): string {
	return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
}

export { LOCALES, translations, detectLocale, interpolate };
export type { Locale };
