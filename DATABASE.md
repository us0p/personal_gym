## Database Schema
The following sections describe the schemas of the database.

Schema notation details:
```plaintext
- <objectStoreName>
    - <atribute>: <type>(listOfAcceptableValues) [constraints]
```

### Object Stores
Here's a list of the available object stores, their purposes and their relationships.

- user: User physical data for general analysis.
- workout: Represents a group of exercises.
- exercise: A unique exercise, the type of action and the body region it affects.
- execution: execution details of a particular exercise in a particular workout routine.

### Object Stores schemas
- user:
    - username: string [unique]
    - sex: option(MALE|FEMALE)
    - birthDate: date
    - height: number

- userWeightProgression:
    - username: string [unique]
    - createdAt: date
    - weight number

- workout:
    - name: string [unique]
    - exercises: Array<string>
    - weekDay: Array<option(mon,tue,wed,thu,fri,sat,sun)>||NULL 

- exercise:
    - name: string [unique]
    - bodyRegion: Array<string>
    - type: option(push/pull/cardio)

- execution:
    - id: number [unique]
    - workoutName: string
    - exerciseName: string
    - repNumber: number||NULL
    - durationMin: number||NULL
    - timestamp: date

- executionRest:
    - id: number [unique]
    - executionId: number
    - timestamp: date
    - durationSeconds: number

- executionSpeed?
    - id: number [unique]
    - exerciseName: string
    - workoutName: string
    - executionDuration: number

