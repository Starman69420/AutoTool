const Docker = require('dockerode');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Initialize Docker client
const docker = new Docker();

// Directory for test results
const testResultsDir = path.join(__dirname, '../../../test-results');
fs.ensureDirSync(testResultsDir);

// Helper to parse test output for issues
const parseTestOutput = (output) => {
  const exitCodeMatch = output.match(/===\s+Exit\s+code:\s+(\d+)\s+===/i);
  const exitCode = exitCodeMatch ? parseInt(exitCodeMatch[1], 10) : null;
  
  // Extract errors (lines containing 'error', 'exception', 'failed', etc.)
  const errorLines = output
    .split('\n')
    .filter(line => /error|exception|failed|fatal|warning|denied/i.test(line));
  
  // Determine success based on exit code and presence of errors
  const success = (exitCode === 0 && errorLines.length === 0);
  
  return {
    success,
    exitCode,
    errorCount: errorLines.length,
    errors: errorLines,
    fullOutput: output
  };
};

// Run a test with a script in a Docker container
exports.runTest = async (req, res) => {
  try {
    const { 
      scriptId, 
      scriptContent, 
      scriptType,
      operatingSystem,
      customImage
    } = req.body;
    
    if (!scriptContent) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Script content is required' 
      });
    }
    
    if (!operatingSystem) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Operating system is required' 
      });
    }
    
    // Create test record
    const testId = uuidv4();
    const testDir = path.join(testResultsDir, testId);
    fs.ensureDirSync(testDir);
    fs.ensureDirSync(path.join(testDir, 'output'));
    
    // Save script to test directory
    const scriptFileName = `test-script.${scriptType || (operatingSystem.toLowerCase().includes('windows') ? 'ps1' : 'sh')}`;
    const scriptPath = path.join(testDir, scriptFileName);
    fs.writeFileSync(scriptPath, scriptContent);
    fs.chmodSync(scriptPath, '755'); // Make executable
    
    // Create test metadata
    const testMetadata = {
      id: testId,
      scriptId,
      operatingSystem,
      startTime: new Date().toISOString(),
      status: 'running',
      containerName: `autotool-test-${testId.substring(0, 8)}`,
      containerImage: customImage || null
    };
    
    // Save test metadata
    fs.writeJsonSync(path.join(testDir, 'metadata.json'), testMetadata);
    
    // Socket.io for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('test:started', { test: testMetadata });
    }
    
    // Start a background process to run the test
    // This allows us to return immediately to the client
    const runTest = async () => {
      try {
        // Determine Docker image based on OS
        let dockerImage = customImage;
        if (!dockerImage) {
          // Map OS to Docker image
          const osMap = {
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
          
          dockerImage = osMap[operatingSystem.toLowerCase()];
          if (!dockerImage) {
            // Default images
            if (operatingSystem.toLowerCase().includes('windows')) {
              dockerImage = 'mcr.microsoft.com/windows/servercore:ltsc2022';
            } else if (operatingSystem.toLowerCase().includes('ubuntu')) {
              dockerImage = 'ubuntu:22.04';
            } else if (operatingSystem.toLowerCase().includes('centos')) {
              dockerImage = 'quay.io/centos/centos:stream8';
            } else if (operatingSystem.toLowerCase().includes('debian')) {
              dockerImage = 'debian:11';
            } else if (operatingSystem.toLowerCase().includes('rhel')) {
              dockerImage = 'registry.access.redhat.com/ubi8/ubi';
            } else {
              dockerImage = 'ubuntu:22.04'; // Default fallback
            }
          }
        }
        
        // Update metadata with image info
        testMetadata.containerImage = dockerImage;
        fs.writeJsonSync(path.join(testDir, 'metadata.json'), testMetadata);
        
        // Create entrypoint script for Linux containers
        const isWindows = operatingSystem.toLowerCase().includes('windows');
        if (!isWindows) {
          const entrypointPath = path.join(testDir, 'entrypoint.sh');
          const entrypointContent = `#!/bin/bash
set -e

# Make script executable
chmod +x /scripts/${scriptFileName}

# Create output directory if it doesn't exist
mkdir -p /scripts/output

# Execute script and capture output
{
  echo "=== Running test script: /scripts/${scriptFileName} ==="
  echo "=== Start time: $(date) ==="
  time /scripts/${scriptFileName} 2>&1
  EXIT_CODE=$?
  echo "=== End time: $(date) ==="
  echo "=== Exit code: \${EXIT_CODE} ==="
} | tee /scripts/output/script_output.log

exit \${EXIT_CODE}
`;
          fs.writeFileSync(entrypointPath, entrypointContent);
          fs.chmodSync(entrypointPath, '755'); // Make executable
        }
        
        // Create a container
        const containerOptions = {
          Image: dockerImage,
          name: testMetadata.containerName,
          Tty: true,
          Cmd: isWindows 
            ? ['powershell', '-Command', `& {C:\\scripts\\${scriptFileName}; exit $LASTEXITCODE}`] 
            : ['/bin/bash', '-c', '/scripts/entrypoint.sh'],
          HostConfig: {
            Binds: [`${testDir}:/scripts`],
            AutoRemove: false
          }
        };
        
        const container = await docker.createContainer(containerOptions);
        testMetadata.containerId = container.id;
        fs.writeJsonSync(path.join(testDir, 'metadata.json'), testMetadata);
        
        if (io) {
          io.emit('test:container:created', { 
            test: testMetadata,
            container: { id: container.id, name: testMetadata.containerName }
          });
        }
        
        // Start the container
        await container.start();
        
        if (io) {
          io.emit('test:container:started', { 
            test: testMetadata 
          });
        }
        
        // Wait for container to finish
        const stream = await container.attach({
          stream: true,
          stdout: true,
          stderr: true
        });
        
        let logs = '';
        stream.on('data', (chunk) => {
          const text = chunk.toString('utf8');
          logs += text;
          
          if (io) {
            io.emit('test:logs', { 
              test: testMetadata,
              logs: text
            });
          }
        });
        
        // Wait for container to exit
        const data = await container.wait();
        const exitCode = data.StatusCode;
        
        // Get container logs if we didn't get them from attach
        if (!logs) {
          const logBuffer = await container.logs({
            stdout: true,
            stderr: true
          });
          logs = logBuffer.toString('utf8');
        }
        
        // Save logs to file
        fs.writeFileSync(path.join(testDir, 'output', 'container_logs.txt'), logs);
        
        // Check if script output exists in mounted volume
        const outputLogPath = path.join(testDir, 'output', 'script_output.log');
        let scriptOutput = '';
        if (fs.existsSync(outputLogPath)) {
          scriptOutput = fs.readFileSync(outputLogPath, 'utf8');
        } else {
          scriptOutput = logs; // Use container logs if script output not found
        }
        
        // Parse test results
        const testResults = parseTestOutput(scriptOutput);
        
        // Update test metadata
        testMetadata.status = 'completed';
        testMetadata.endTime = new Date().toISOString();
        testMetadata.exitCode = exitCode;
        testMetadata.success = testResults.success;
        testMetadata.errorCount = testResults.errorCount;
        
        fs.writeJsonSync(path.join(testDir, 'metadata.json'), testMetadata);
        fs.writeJsonSync(path.join(testDir, 'results.json'), testResults);
        
        // Clean up container
        try {
          await container.remove();
        } catch (error) {
          console.error('Error removing container:', error);
        }
        
        if (io) {
          io.emit('test:completed', { 
            test: testMetadata,
            results: testResults
          });
        }
        
      } catch (error) {
        console.error('Error running test:', error);
        
        // Update test metadata with error
        testMetadata.status = 'failed';
        testMetadata.endTime = new Date().toISOString();
        testMetadata.error = error.message;
        
        fs.writeJsonSync(path.join(testDir, 'metadata.json'), testMetadata);
        
        if (io) {
          io.emit('test:error', { 
            test: testMetadata,
            error: error.message
          });
        }
      }
    };
    
    // Run the test in the background
    runTest().catch(console.error);
    
    // Return immediately with the test ID
    res.status(202).json({
      status: 'success',
      message: 'Test started',
      test: testMetadata
    });
    
  } catch (error) {
    console.error('Error initiating test:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// List all tests
exports.listTests = (req, res) => {
  try {
    const testDirs = fs.readdirSync(testResultsDir)
      .filter(dir => fs.statSync(path.join(testResultsDir, dir)).isDirectory());
    
    const tests = testDirs.map(dir => {
      const metadataPath = path.join(testResultsDir, dir, 'metadata.json');
      if (fs.existsSync(metadataPath)) {
        return fs.readJsonSync(metadataPath);
      }
      return null;
    }).filter(Boolean)
    .sort((a, b) => {
      // Sort by start time (newest first)
      return new Date(b.startTime) - new Date(a.startTime);
    });
    
    res.status(200).json({
      status: 'success',
      count: tests.length,
      tests
    });
  } catch (error) {
    console.error('Error listing tests:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get a specific test result
exports.getTestResult = (req, res) => {
  try {
    const { id } = req.params;
    const testDir = path.join(testResultsDir, id);
    
    if (!fs.existsSync(testDir)) {
      return res.status(404).json({ status: 'error', message: 'Test not found' });
    }
    
    const metadataPath = path.join(testDir, 'metadata.json');
    const resultsPath = path.join(testDir, 'results.json');
    
    // Get metadata
    if (!fs.existsSync(metadataPath)) {
      return res.status(404).json({ status: 'error', message: 'Test metadata not found' });
    }
    const metadata = fs.readJsonSync(metadataPath);
    
    // Get results if available
    let results = null;
    if (fs.existsSync(resultsPath)) {
      results = fs.readJsonSync(resultsPath);
    }
    
    res.status(200).json({
      status: 'success',
      test: metadata,
      results
    });
  } catch (error) {
    console.error('Error getting test result:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get test logs
exports.getTestLogs = (req, res) => {
  try {
    const { id } = req.params;
    const testDir = path.join(testResultsDir, id);
    
    if (!fs.existsSync(testDir)) {
      return res.status(404).json({ status: 'error', message: 'Test not found' });
    }
    
    const outputLogPath = path.join(testDir, 'output', 'script_output.log');
    const containerLogPath = path.join(testDir, 'output', 'container_logs.txt');
    
    // Try to get script output first
    let logs = '';
    if (fs.existsSync(outputLogPath)) {
      logs = fs.readFileSync(outputLogPath, 'utf8');
    } else if (fs.existsSync(containerLogPath)) {
      // Fall back to container logs
      logs = fs.readFileSync(containerLogPath, 'utf8');
    }
    
    res.status(200).json({
      status: 'success',
      testId: id,
      logs
    });
  } catch (error) {
    console.error('Error getting test logs:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};