 import mongoose from "mongoose"

const userSchema = new mongoose.Schema({
  id: {
    type: 'string',
    format: 'uuid',
    description: 'Unique identifier for the user',
  },
  username: {
    type: 'string',
    minLength: 3,
    maxLength: 30,
    description: 'Username of the user',
  },
  email: {
    type: 'string',
    format: 'email',
    description: 'Email address of the user',
  },
  password: {
    type: 'string',
    minLength: 8,
    description: 'Password for the user account',
  },
  createdAt: {
    type: 'string',
    format: 'date-time',
    description: 'Timestamp when the user was created',
  },
  updatedAt: {
    type: 'string',
    format: 'date-time',
    description: 'Timestamp when the user was last updated',
  },
  profilePicture: {
    type: 'string',
    format: 'uri',
    description: 'URL of the user\'s profile picture',
  },
  bio: {
    type: 'string',
    maxLength: 500,
    description: 'Short biography of the user',
  },
  isActive: {
    type: 'boolean',
    description: 'Indicates if the user account is active',
  },
  lastLogin: {
    type: 'string',
    format: 'date-time',
    description: 'Timestamp of the user\'s last login',
  },
  preferences: {
    type: 'object',
    properties: {
      theme: {
        type: 'string',
        enum: ['light', 'dark'],
        description: 'User interface theme preference',
      },
      notifications: {
        type: 'boolean',
        description: 'Indicates if the user wants to receive notifications',
      },
    },
    description: 'User-specific preferences for the application',
  }
}
)
  

const User = mongoose.models.User || mongoose.model("User", userSchema);

export { User };
