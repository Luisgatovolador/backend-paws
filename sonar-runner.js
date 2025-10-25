require('dotenv').config(); // Carga variables de .env
const SonarScanner = require('sonarqube-scanner'); // Importar correctamente

SonarScanner(
  {
    serverUrl: 'https://sonarcloud.io',
    options: {
      'sonar.organization': process.env.SONAR_ORG || 'luisgatovolador',
      'sonar.projectKey': process.env.SONAR_PROJECT_KEY || 'Luisgatovolador_backend-paws',
      'sonar.sources': 'src',
      'sonar.tests': 'src/test',
      'sonar.exclusions': 'src/test/**, node_modules/**, src/routes/**, src/app.js, src/server.js, src/db/**, src/middlewares/**, src/models/**, src/services/**, src/swagger/**, src/views/**,src/config/**',
      'sonar.javascript.lcov.reportPaths': 'coverage/lcov.info',
      'sonar.login': process.env.SONAR_TOKEN || '53e65bded7b196a096fb6c2256ee2baaed41d0b6',
      'sonar.sourceEncoding': 'UTF-8'
    }
  },
  () => process.exit()
);
