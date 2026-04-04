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
    - workoutId: number
    - timestamp: date
    - durationSeconds: number

## Notes
- workout:
    - there should be a "START/END" button, that stores the start and end 
    time of a workout session (good for metrics).
- Remove home page and all unused code, take care to not break anything.

### Ideas
- if we could store the duration of each series would be very good to 
    determine the TIME UNDER STRESS in each exercise and the muscular impact.
    Maybe voice command?
- Add descriptions to exercises
- Animated images showing how to execute exercise properly
- Central hub for exercises
    - users submit exercises for approval, ai agent analyses requests and 
    adds to the public dataset if certain level of quality is achieved 
    in the exercise description.
    - using browser ai capabilities, we could provide video analysis to 
    extract and generate new exercises.
