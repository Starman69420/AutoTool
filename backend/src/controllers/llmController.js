const axios = require('axios');
const { OpenAI } = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const scriptsDir = path.join(__dirname, '../../scripts');
fs.ensureDirSync(scriptsDir);

// Initialize LLM clients (to be set when keys are provided)
let openaiClient = null;
let anthropicClient = null;

// Validate API key
exports.validateApiKey = async (req, res) => {
  try {
    const { provider, apiKey } = req.body;
    
    if (!provider || !apiKey) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Provider and API key are required' 
      });
    }
    
    let isValid = false;
    let error = null;
    
    if (provider === 'openai') {
      try {
        const tempClient = new OpenAI({ apiKey });
        const response = await tempClient.models.list();
        isValid = response && response.data && response.data.length > 0;
      } catch (err) {
        error = err.message;
      }
    } else if (provider === 'anthropic') {
      try {
        const tempClient = new Anthropic({ apiKey });
        const response = await tempClient.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hello' }]
        });
        isValid = !!response;
      } catch (err) {
        error = err.message;
      }
    } else {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Unsupported provider. Use "openai" or "anthropic"' 
      });
    }
    
    if (isValid) {
      return res.status(200).json({ 
        status: 'success', 
        message: 'API key is valid' 
      });
    } else {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Invalid API key', 
        error 
      });
    }
  } catch (error) {
    console.error('Error validating API key:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Generate script from requirements
exports.generateScript = async (req, res) => {
  try {
    const { requirementId, requirementContent, provider, apiKey, operatingSystem } = req.body;
    
    if (!requirementContent) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Requirement content is required' 
      });
    }
    
    if (!provider || !apiKey) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'LLM provider and API key are required' 
      });
    }
    
    if (!operatingSystem) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Target operating system is required' 
      });
    }
    
    // Initialize the appropriate client
    if (provider === 'openai') {
      openaiClient = new OpenAI({ apiKey });
    } else if (provider === 'anthropic') {
      anthropicClient = new Anthropic({ apiKey });
    } else {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Unsupported provider. Use "openai" or "anthropic"' 
      });
    }
    
    // Prepare the prompt
    const scriptPrompt = `
You are an expert system administrator and script developer.
Generate a script for the following requirement targeting ${operatingSystem}.
The script should be comprehensive, robust, and follow best practices.

REQUIREMENT:
${requirementContent}

Your task is to create a script that fulfills all the requirements.
The script must:
1. Be executable on ${operatingSystem}
2. Include proper error handling
3. Have clear comments explaining what each section does
4. Be optimized for performance and reliability
5. Include validation checks where appropriate

Output only the script itself with appropriate comments, no explanations or other text.
For Windows, provide a PowerShell script. For Linux, provide a Bash script.
`;

    let scriptContent = '';
    let scriptType = operatingSystem.toLowerCase().includes('windows') ? 'ps1' : 'sh';
    
    // Generate script using the selected LLM
    if (provider === 'openai') {
      const completion = await openaiClient.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: scriptPrompt }],
        temperature: 0.2
      });
      
      scriptContent = completion.choices[0].message.content;
    } else if (provider === 'anthropic') {
      const message = await anthropicClient.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 4000,
        messages: [{ role: 'user', content: scriptPrompt }]
      });
      
      scriptContent = message.content[0].text;
    }
    
    // Clean up the script (remove markdown code block if present)
    scriptContent = scriptContent.replace(/```\w*\n/g, '').replace(/```$/g, '').trim();
    
    // Save the generated script
    const scriptId = uuidv4();
    const scriptFileName = `${scriptId}.${scriptType}`;
    const scriptPath = path.join(scriptsDir, scriptFileName);
    
    fs.writeFileSync(scriptPath, scriptContent);
    
    // Determine script title
    let scriptTitle = 'Generated Script';
    if (requirementContent) {
      const titleMatch = requirementContent.match(/^# (.+)$/m);
      if (titleMatch && titleMatch[1]) {
        scriptTitle = `Script for ${titleMatch[1]}`;
      }
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Script generated successfully',
      script: {
        id: scriptId,
        title: scriptTitle,
        fileName: scriptFileName,
        path: scriptPath,
        content: scriptContent,
        type: scriptType,
        targetOs: operatingSystem,
        generatedAt: new Date().toISOString(),
        requirementId: requirementId || null
      }
    });
    
  } catch (error) {
    console.error('Error generating script:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Generate remediation script based on test results
exports.remediateScript = async (req, res) => {
  try {
    const { 
      originalScriptId, 
      originalScriptContent, 
      testResults, 
      provider, 
      apiKey, 
      operatingSystem 
    } = req.body;
    
    if (!originalScriptContent || !testResults) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Original script and test results are required' 
      });
    }
    
    if (!provider || !apiKey) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'LLM provider and API key are required' 
      });
    }
    
    // Initialize the appropriate client
    if (provider === 'openai') {
      openaiClient = new OpenAI({ apiKey });
    } else if (provider === 'anthropic') {
      anthropicClient = new Anthropic({ apiKey });
    } else {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Unsupported provider. Use "openai" or "anthropic"' 
      });
    }
    
    // Prepare the prompt
    const remediationPrompt = `
You are an expert system administrator and script debugging specialist.
Analyze the following script and test results, then create an improved version that fixes all issues.

ORIGINAL SCRIPT:
\`\`\`
${originalScriptContent}
\`\`\`

TEST RESULTS:
\`\`\`
${testResults}
\`\`\`

Your task is to:
1. Identify all errors and issues in the original script
2. Create a completely new, improved script that fixes these issues
3. Ensure the remediated script is optimized for ${operatingSystem}
4. Include detailed comments explaining what was fixed and why

Output only the remediated script with appropriate comments, no explanations or other text.
`;

    let remediatedScriptContent = '';
    let scriptType = operatingSystem.toLowerCase().includes('windows') ? 'ps1' : 'sh';
    
    // Generate remediated script using the selected LLM
    if (provider === 'openai') {
      const completion = await openaiClient.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: remediationPrompt }],
        temperature: 0.2
      });
      
      remediatedScriptContent = completion.choices[0].message.content;
    } else if (provider === 'anthropic') {
      const message = await anthropicClient.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 4000,
        messages: [{ role: 'user', content: remediationPrompt }]
      });
      
      remediatedScriptContent = message.content[0].text;
    }
    
    // Clean up the script (remove markdown code block if present)
    remediatedScriptContent = remediatedScriptContent.replace(/```\w*\n/g, '').replace(/```$/g, '').trim();
    
    // Save the remediated script
    const scriptId = uuidv4();
    const scriptFileName = `${scriptId}_remediated.${scriptType}`;
    const scriptPath = path.join(scriptsDir, scriptFileName);
    
    fs.writeFileSync(scriptPath, remediatedScriptContent);
    
    res.status(200).json({
      status: 'success',
      message: 'Remediation script generated successfully',
      script: {
        id: scriptId,
        title: `Remediated Script (${new Date().toLocaleString()})`,
        fileName: scriptFileName,
        path: scriptPath,
        content: remediatedScriptContent,
        type: scriptType,
        targetOs: operatingSystem,
        generatedAt: new Date().toISOString(),
        originalScriptId: originalScriptId || null,
        isRemediation: true
      }
    });
    
  } catch (error) {
    console.error('Error generating remediation script:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};