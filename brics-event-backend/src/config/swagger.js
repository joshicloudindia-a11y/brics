import swaggerJSDoc from 'swagger-jsdoc';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BRICS Event Management API',
      version: '1.0.0',
      description: 'Event registration and management APIs'
    },
    servers: [
      {
        url: process.env.BACKEND_URL || 'http://localhost:3000',
        description: `${process.env.NODE_ENV || 'development'} server`
      }
    ],
    tags: [
      { name: 'Auth', description: 'Authentication and authorization and user management APIs' },
      { name: 'Event', description: 'Event management & participation APIs' },
      { name: 'Session', description: 'Event session management APIs' },
      { name: 'Speaker', description: 'Speaker management APIs' },
      { name: 'Travel', description: 'Travel management APIs' },
      { name: 'Hotel', description: 'Hotel accommodation management APIs' },
      { name: 'Hotel Master', description: 'Hotel master management APIs' },
      { name: 'Conference Halls', description: 'Conference hall management APIs' },
      { name: 'Role', description: 'Role management APIs' },
      { name: 'Activity', description: 'Activity audit and statistics APIs' }
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },

    security: [
      {
        bearerAuth: []
      }
    ]

  },

  apis: [
    './src/routes/*.js',
    './src/controllers/*.js'
  ]
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

export default swaggerSpec;
