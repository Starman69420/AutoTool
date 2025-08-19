const Docker = require('dockerode');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Initialize Docker client
const docker = new Docker();

// Map of OS to Docker images
const osImageMap = {
  'windows-2016': 'mcr.microsoft.com/windows/servercore:ltsc2016',
  'windows-2019': 'mcr.microsoft.com/windows/servercore:ltsc2019',
  'windows-2022': 'mcr.microsoft.com/windows/servercore:ltsc2022',
  'ubuntu-20.04': 'ubuntu:20.04',
  'ubuntu-22.04': 'ubuntu:22.04',
  'centos-7': 'centos:7',
  'centos-8': 'quay.io/centos/centos:stream8',
  'debian-10': 'debian:10',
  'debian-11': 'debian:11',
  'rhel-8': 'registry.access.redhat.com/ubi8/ubi',
  'rhel-9': 'registry.access.redhat.com/ubi9/ubi'
};

// List available Docker images
exports.listImages = async (req, res) => {
  try {
    const images = await docker.listImages();
    
    // Filter and format images for display
    const formattedImages = images.map(image => {
      // Extract repo tags
      const repoTags = image.RepoTags || ['<none>:<none>'];
      
      return {
        id: image.Id.substring(7, 19), // Short ID
        repoTags,
        created: new Date(image.Created * 1000).toISOString(),
        size: (image.Size / (1024 * 1024)).toFixed(2) + ' MB',
        virtualSize: (image.VirtualSize / (1024 * 1024)).toFixed(2) + ' MB'
      };
    });
    
    // Add OS mapping information
    const availableOsImages = Object.entries(osImageMap).map(([osKey, imageTag]) => {
      const found = formattedImages.some(img => 
        img.repoTags.some(tag => tag === imageTag)
      );
      
      return {
        os: osKey,
        imageTag,
        available: found
      };
    });
    
    res.status(200).json({
      status: 'success',
      count: formattedImages.length,
      images: formattedImages,
      osImages: availableOsImages
    });
  } catch (error) {
    console.error('Error listing Docker images:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Pull a Docker image
exports.pullImage = async (req, res) => {
  try {
    const { imageTag, os } = req.body;
    
    // If OS is provided, use the mapping
    const imageToPull = os ? osImageMap[os] : imageTag;
    
    if (!imageToPull) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Either imageTag or a valid OS key is required' 
      });
    }
    
    // Stream the pull to the client through socket.io if available
    const io = req.app.get('io');
    const pullStream = await docker.pull(imageToPull);
    
    let pullOutput = '';
    pullStream.on('data', data => {
      const chunk = data.toString('utf8');
      pullOutput += chunk;
      
      try {
        const pullData = JSON.parse(chunk);
        if (io) {
          io.emit('docker:pull:progress', {
            status: pullData.status,
            progress: pullData.progress,
            id: pullData.id
          });
        }
      } catch (e) {
        // Not valid JSON, could be partial chunk
      }
    });
    
    // Wait for pull to complete
    await new Promise((resolve, reject) => {
      pullStream.on('end', resolve);
      pullStream.on('error', reject);
    });
    
    res.status(200).json({
      status: 'success',
      message: `Image ${imageToPull} pulled successfully`,
      imageTag: imageToPull,
      output: pullOutput
    });
  } catch (error) {
    console.error('Error pulling Docker image:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// List running containers
exports.listContainers = async (req, res) => {
  try {
    const { all = true } = req.query;
    const containers = await docker.listContainers({ all: Boolean(all) });
    
    // Format container data
    const formattedContainers = containers.map(container => {
      return {
        id: container.Id.substring(0, 12),
        name: container.Names[0].replace(/^\//, ''),
        image: container.Image,
        created: new Date(container.Created * 1000).toISOString(),
        state: container.State,
        status: container.Status
      };
    });
    
    res.status(200).json({
      status: 'success',
      count: formattedContainers.length,
      containers: formattedContainers
    });
  } catch (error) {
    console.error('Error listing Docker containers:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Create a container for testing
exports.createContainer = async (req, res) => {
  try {
    const { 
      imageTag, 
      os, 
      name = `autotool-${uuidv4().substring(0, 8)}`,
      scriptId,
      scriptContent,
      scriptType
    } = req.body;
    
    // If OS is provided, use the mapping
    const image = os ? osImageMap[os] : imageTag;
    
    if (!image) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Either imageTag or a valid OS key is required' 
      });
    }
    
    if (!scriptContent) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Script content is required' 
      });
    }
    
    // Create a temporary directory to mount in the container
    const tmpDir = path.join(__dirname, '../../../test-results', uuidv4());
    fs.ensureDirSync(tmpDir);
    
    // Write the script to the temp directory
    const scriptFileName = `test-script.${scriptType || 'sh'}`;
    const scriptPath = path.join(tmpDir, scriptFileName);
    fs.writeFileSync(scriptPath, scriptContent);
    fs.chmodSync(scriptPath, '755'); // Make executable
    
    // Create a container
    const isWindows = image.includes('windows');
    const containerOptions = {
      Image: image,
      name,
      Tty: true,
      Cmd: isWindows 
        ? ['powershell', '-Command', `& {C:\\scripts\\${scriptFileName}}`] 
        : ['/bin/bash', '-c', '/scripts/entrypoint.sh'],
      HostConfig: {
        Binds: [`${tmpDir}:/scripts`],
        AutoRemove: false
      },
      Env: [
        'SCRIPT_PATH=/scripts/' + scriptFileName
      ]
    };
    
    // For Linux containers, create an entrypoint script
    if (!isWindows) {
      const entrypointPath = path.join(tmpDir, 'entrypoint.sh');
      const entrypointContent = `#!/bin/bash
set -e

# Make script executable
chmod +x \${SCRIPT_PATH}

# Create output directory
mkdir -p /scripts/output

# Execute script and capture output
{
  echo "=== Running test script: \${SCRIPT_PATH} ==="
  echo "=== Start time: $(date) ==="
  time \${SCRIPT_PATH} 2>&1
  EXIT_CODE=$?
  echo "=== End time: $(date) ==="
  echo "=== Exit code: \${EXIT_CODE} ==="
} | tee /scripts/output/script_output.log

exit \${EXIT_CODE}
`;
      fs.writeFileSync(entrypointPath, entrypointContent);
      fs.chmodSync(entrypointPath, '755'); // Make executable
    }
    
    const container = await docker.createContainer(containerOptions);
    
    res.status(201).json({
      status: 'success',
      message: 'Container created',
      container: {
        id: container.id,
        name,
        image,
        scriptId: scriptId || null,
        scriptPath,
        outputDir: tmpDir,
        created: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating Docker container:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Start a container
exports.startContainer = async (req, res) => {
  try {
    const { id } = req.params;
    const container = docker.getContainer(id);
    
    // Start the container
    await container.start();
    
    // Get container info
    const info = await container.inspect();
    
    res.status(200).json({
      status: 'success',
      message: 'Container started',
      container: {
        id,
        name: info.Name.replace(/^\//, ''),
        state: info.State,
        startedAt: info.State.StartedAt
      }
    });
  } catch (error) {
    console.error('Error starting Docker container:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Stop a container
exports.stopContainer = async (req, res) => {
  try {
    const { id } = req.params;
    const container = docker.getContainer(id);
    
    // Stop the container
    await container.stop();
    
    res.status(200).json({
      status: 'success',
      message: 'Container stopped',
      containerId: id
    });
  } catch (error) {
    console.error('Error stopping Docker container:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Remove a container
exports.removeContainer = async (req, res) => {
  try {
    const { id } = req.params;
    const { force = false } = req.query;
    const container = docker.getContainer(id);
    
    // Remove the container
    await container.remove({ force: Boolean(force) });
    
    res.status(200).json({
      status: 'success',
      message: 'Container removed',
      containerId: id
    });
  } catch (error) {
    console.error('Error removing Docker container:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};