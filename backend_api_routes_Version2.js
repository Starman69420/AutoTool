const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs-extra');

// Import controllers
const requirementController = require('./controllers/requirementController');
const scriptController = require('./controllers/scriptController');
const dockerController = require('./controllers/dockerController');
const llmController = require('./controllers/llmController');
const testController = require('./controllers/testController');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Accept only markdown files for requirements
    if (file.mimetype === 'text/markdown' || 
        file.originalname.endsWith('.md') ||
        file.mimetype === 'text/plain') {
      cb(null, true);
    } else {
      cb(new Error('Only markdown files are allowed'));
    }
  }
});

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Requirement routes
router.post('/requirements/upload', upload.single('file'), requirementController.uploadRequirement);
router.post('/requirements/create', requirementController.createRequirement);
router.get('/requirements', requirementController.listRequirements);
router.get('/requirements/:id', requirementController.getRequirement);

// LLM routes
router.post('/llm/validate-key', llmController.validateApiKey);
router.post('/llm/generate-script', llmController.generateScript);
router.post('/llm/remediate-script', llmController.remediateScript);

// Script routes
router.get('/scripts', scriptController.listScripts);
router.get('/scripts/:id', scriptController.getScript);
router.post('/scripts', scriptController.createScript);
router.put('/scripts/:id', scriptController.updateScript);

// Docker routes
router.get('/docker/images', dockerController.listImages);
router.post('/docker/images/pull', dockerController.pullImage);
router.get('/docker/containers', dockerController.listContainers);
router.post('/docker/containers/create', dockerController.createContainer);
router.post('/docker/containers/:id/start', dockerController.startContainer);
router.post('/docker/containers/:id/stop', dockerController.stopContainer);
router.delete('/docker/containers/:id', dockerController.removeContainer);

// Testing routes
router.post('/tests/run', testController.runTest);
router.get('/tests', testController.listTests);
router.get('/tests/:id', testController.getTestResult);
router.get('/tests/:id/logs', testController.getTestLogs);

module.exports = router;