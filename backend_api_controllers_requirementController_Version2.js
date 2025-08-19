const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const marked = require('marked');

const requirementsDir = path.join(__dirname, '../../../uploads');
fs.ensureDirSync(requirementsDir);

// Helper to get all requirements
const getRequirementFiles = () => {
  const files = fs.readdirSync(requirementsDir);
  return files
    .filter(file => file.endsWith('.md'))
    .map(file => {
      const filePath = path.join(requirementsDir, file);
      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Extract title from content (first h1)
      let title = 'Untitled Requirement';
      const titleMatch = content.match(/^# (.+)$/m);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1];
      }
      
      return {
        id: path.basename(file, '.md'),
        title,
        path: filePath,
        created: stats.birthtime,
        modified: stats.mtime,
        size: stats.size
      };
    })
    .sort((a, b) => b.modified - a.modified);
};

// Upload a requirement file
exports.uploadRequirement = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }

    const fileId = path.basename(req.file.filename, path.extname(req.file.filename));
    const filePath = req.file.path;
    
    // Read the file to extract metadata
    const content = fs.readFileSync(filePath, 'utf8');
    let title = 'Untitled Requirement';
    const titleMatch = content.match(/^# (.+)$/m);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1];
    }
    
    res.status(201).json({
      status: 'success',
      message: 'Requirement file uploaded',
      requirement: {
        id: fileId,
        title,
        path: filePath,
        content
      }
    });
  } catch (error) {
    console.error('Error uploading requirement:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Create a new requirement file from content
exports.createRequirement = (req, res) => {
  try {
    const { title, content } = req.body;
    
    if (!content) {
      return res.status(400).json({ status: 'error', message: 'Content is required' });
    }
    
    const fileId = uuidv4();
    const fileName = `${fileId}.md`;
    const filePath = path.join(requirementsDir, fileName);
    
    // Ensure the content has a title
    let fileContent = content;
    if (!content.trim().startsWith('# ')) {
      fileContent = `# ${title || 'Untitled Requirement'}\n\n${content}`;
    }
    
    fs.writeFileSync(filePath, fileContent);
    
    res.status(201).json({
      status: 'success',
      message: 'Requirement created',
      requirement: {
        id: fileId,
        title: title || 'Untitled Requirement',
        path: filePath,
        content: fileContent
      }
    });
  } catch (error) {
    console.error('Error creating requirement:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// List all requirements
exports.listRequirements = (req, res) => {
  try {
    const requirements = getRequirementFiles();
    res.status(200).json({
      status: 'success',
      count: requirements.length,
      requirements
    });
  } catch (error) {
    console.error('Error listing requirements:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get a specific requirement
exports.getRequirement = (req, res) => {
  try {
    const { id } = req.params;
    const filePath = path.join(requirementsDir, `${id}.md`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ status: 'error', message: 'Requirement not found' });
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const stats = fs.statSync(filePath);
    
    // Extract title from content
    let title = 'Untitled Requirement';
    const titleMatch = content.match(/^# (.+)$/m);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1];
    }
    
    // Parse markdown to HTML for rendering
    const html = marked.parse(content);
    
    res.status(200).json({
      status: 'success',
      requirement: {
        id,
        title,
        path: filePath,
        content,
        html,
        created: stats.birthtime,
        modified: stats.mtime,
        size: stats.size
      }
    });
  } catch (error) {
    console.error('Error getting requirement:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};