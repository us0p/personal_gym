# Personal GYM
A Client-Side only GYM application that helps you to manage your training, 
diet and track evolution, all in a single place.

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
    - age: number
    - weight: number
    - height: number

- workout:
    - name: string [unique]
    - exercises: Array<string>

- exercise:
    - name: string [unique]
    - bodyRegion: Array<string>
    - type: option(push/pull)

- execution:
    - workoutName: string
    - exerciseName: string
    - repNumber: number
    - timestamp: date
