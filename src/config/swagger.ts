import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'UdharBook API',
      version: '1.0.0',
      description: 'REST API for UdharBook — Kirana Credit Management SaaS for Indian shopkeepers',
      contact: { name: 'UdharBook Team', email: 'support@udharbook.in' },
    },
    servers: [
      { url: '/api/v1', description: 'API v1' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ['./src/modules/**/*.routes.ts', './src/modules/**/*.schema.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
