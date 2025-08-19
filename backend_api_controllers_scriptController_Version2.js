const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const scriptsDir = path.join(__dirname, '../../../scripts');
fs.ensureDirSync(scriptsDir);

// Helper to get all scripts
const getScriptFiles = () => {
  const files = fs.readdirSync(scriptsDir);
  return files
    .filter(file => file.endsWith('.sh') || file.endsWith('.ps1'))
    .map(file => {
      const filePath = path.join(scriptsDir, file);
      const stats = fs.statSync(filePath);
      const id = path.basename(file, path.extname(file));
      const type = path.extname(file).substring(1);
      const content = fs.readFileSync(filePath, 'utf8');
      
      return {
        id,
        fileName: file,
        title: `Script ${id}`,
        path: filePath,
        type,
        content,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isRemediation: file.includes('_remediated')
      };
    })
    .sort((a, b) => b.modified - a.modified);
};

// List all scripts
exports.listScripts = (req, res) => {
  try {
    const scripts = getScriptFiles();
    res.status(200).json({
      status: 'success',
      count: scripts.length,
      scripts
    });
  } catch (error) {
    console.error('Error listing scripts:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get a specific script
exports.getScript = (req, res) => {
  try {
    const { id } = req.params;
    
    // Find all potential files (with different extensions)
    const potentialFiles = fs.readdirSync(scriptsDir)
      .filter(file => file.startsWith(id) && (file.endsWith('.sh') || file.endsWith('.ps1')));
    
    if (potentialFiles.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Script not found' });
    }
    
    const fileName = potentialFiles[0];
    const filePath = path.join(scriptsDir, fileName);
    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const type = path.extname(fileName).substring(1);
    
    res.status(200).json({
      status: 'success',
      script: {
        id,
        fileName,
        title: `Script ${id}`,
        path: filePath,
        type,
        content,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isRemediation: fileName.includes('_remediated')
      }
    });
  } catch (error) {
    console.error('Error getting script:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Create a new script
exports.createScript = (req, res) => {
  try {
    const { title, content, type = 'sh', targetOs } = req.body;
    
    if (!content) {
      return res.status(400).json({ status: 'error', message: 'Script content is required' });
    }
    
    // Validate script type
    if (type !== 'sh' && type !== 'ps1') {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Invalid script type. Use "sh" for Linux or "ps1" for Windows' 
      });
    }
    
    const scriptId = uuidv4();
    const fileName = `${scriptId}.${type}`;
    const filePath = path.join(scriptsDir, fileName);
    
    fs.writeFileSync(filePath, content);
    
    res.status(201).json({
      status: 'success',
      message: 'Script created',
      script: {
        id: scriptId,
        fileName,
        title: title || `Script ${scriptId}`,
        path: filePath,
        type,
        content,
        targetOs: targetOs || 'unknown',
        size: content.length,
        created: new Date(),
        modified: new Date()
      }
    });
  } catch (error) {
    console.error('Error creating script:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Update an existing script
exports.updateScript = (req, res) => {
  try {
    const { id } = req.params;
    const { content, title } = req.body;
    
    if (!content) {
      return res.status(400).json({ status: 'error', message: 'Script content is required' });
    }
    
    // Find all potential files (with different extensions)
    const potentialFiles = fs.readdirSync(scriptsDir)
      .filter(file => file.startsWith(id) && (file.endsWith('.sh') || file.endsWith('.ps1')));
    
    if (potentialFiles.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Script not found' });
    }
    
    const fileName = potentialFiles[0];
    const filePath = path.join(scriptsDir, fileName);
    const type = path.extname(fileName).substring(1);
    
    fs.writeFileSync(filePath, content);
    const stats = fs.statSync(filePath);
    
    res.status(200).json({
      status: 'success',
      message: 'Script updated',
      script: {
        id,
        fileName,
        title: title || `Script ${id}`,
        path: filePath,
        type,
        content,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isRemediation: fileName.includes('_remediated')
      }
    });
  } catch (error) {
    console.error('Error updating script:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};