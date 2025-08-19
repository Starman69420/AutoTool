import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import MonacoEditor from 'react-monaco-editor';
import axios from 'axios';

const ScriptGenerator = ({ socket }) => {
  // State for form
  const [requirements, setRequirements] = useState([]);
  const [selectedRequirement, setSelectedRequirement] = useState('');
  const [requirementContent, setRequirementContent] = useState('');
  const [apiProvider, setApiProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [operatingSystem, setOperatingSystem] = useState('');
  const [scriptContent, setScriptContent] = useState('');
  const [generatedScript, setGeneratedScript] = useState(null);
  
  // UI state
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch requirements on mount
  useEffect(() => {
    const fetchRequirements = async () => {
      try {
        const response = await axios.get('/api/requirements');
        setRequirements(response.data.requirements || []);
      } catch (err) {
        console.error('Error fetching requirements:', err);
        setError('Failed to load requirements. Please try again.');
      }
    };

    fetchRequirements();
  }, []);

  // Fetch requirement content when selected
  useEffect(() => {
    const fetchRequirementContent = async () => {
      if (!selectedRequirement) {
        setRequirementContent('');
        return;
      }

      try {
        const response = await axios.get(`/api/requirements/${selectedRequirement}`);
        setRequirementContent(response.data.requirement.content);
      } catch (err) {
        console.error('Error fetching requirement content:', err);
        setError('Failed to load requirement content. Please try again.');
      }
    };

    fetchRequirementContent();
  }, [selectedRequirement]);

  // Handle API key validation
  const validateApiKey = async () => {
    if (!apiKey || !apiProvider) {
      setError('API provider and key are required');
      return false;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/llm/validate-key', {
        provider: apiProvider,
        apiKey,
      });
      
      setLoading(false);
      if (response.data.status === 'success') {
        setSuccess('API key is valid');
        return true;
      } else {
        setError('Invalid API key');
        return false;
      }
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || 'Failed to validate API key');
      return false;
    }
  };

  // Generate script
  const generateScript = async () => {
    if (!requirementContent) {
      setError('No requirement content found');
      return;
    }

    if (!operatingSystem) {
      setError('Please select a target operating system');
      return;
    }

    const isKeyValid = await validateApiKey();
    if (!isKeyValid) return;

    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/llm/generate-script', {
        requirementId: selectedRequirement,
        requirementContent,
        provider: apiProvider,
        apiKey,
        operatingSystem,
      });

      setGeneratedScript(response.data.script);
      setScriptContent(response.data.script.content);
      setSuccess('Script generated successfully');
      setActiveStep(2); // Move to the review step
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || 'Failed to generate script');
    }
  };

  // Save the generated script (if changes were made)
  const saveScript = async () => {
    if (!generatedScript) return;

    setLoading(true);
    try {
      const response = await axios.put(`/api/scripts/${generatedScript.id}`, {
        content: scriptContent,
        title: generatedScript.title,
      });

      setSuccess('Script saved successfully');
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || 'Failed to save script');
    }
  };

  // Handle next step
  const handleNext = () => {
    if (activeStep === 1) {
      generateScript();
    } else {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  // Handle back step
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  // Steps for the stepper
  const steps = ['Select Requirement', 'Configure Generator', 'Review Script'];

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Script Generator
      </Typography>
      
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Error and success messages */}
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar 
        open={!!success} 
        autoHideDuration={3000} 
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>

      {/* Step 1: Select Requirement */}
      {activeStep === 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Select a requirement to generate a script for
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Requirement</InputLabel>
                <Select
                  value={selectedRequirement}
                  onChange={(e) => setSelectedRequirement(e.target.value)}
                  label="Requirement"
                >
                  <MenuItem value="">
                    <em>Select a requirement</em>
                  </MenuItem>
                  {requirements.map((req) => (
                    <MenuItem key={req.id} value={req.id}>
                      {req.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {requirementContent && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Requirement Content:
                </Typography>
                <Card variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
                  <CardContent>
                    <ReactMarkdown>{requirementContent}</ReactMarkdown>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!selectedRequirement}
            >
              Next
            </Button>
          </Box>
        </Paper>
      )}

      {/* Step 2: Configure Generator */}
      {activeStep === 1 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Configure Script Generator
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>LLM Provider</InputLabel>
                <Select
                  value={apiProvider}
                  onChange={(e) => setApiProvider(e.target.value)}
                  label="LLM Provider"
                >
                  <MenuItem value="openai">OpenAI</MenuItem>
                  <MenuItem value="anthropic">Anthropic (Claude)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="API Key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Target Operating System</InputLabel>
                <Select
                  value={operatingSystem}
                  onChange={(e) => setOperatingSystem(e.target.value)}
                  label="Target Operating System"
                >
                  <MenuItem value="">
                    <em>Select an operating system</em>
                  </MenuItem>
                  <MenuItem value="windows-2016">Windows Server 2016</MenuItem>
                  <MenuItem value="windows-2019">Windows Server 2019</MenuItem>
                  <MenuItem value="windows-2022">Windows Server 2022</MenuItem>
                  <MenuItem value="ubuntu-20.04">Ubuntu 20.04</MenuItem>
                  <MenuItem value="ubuntu-22.04">Ubuntu 22.04</MenuItem>
                  <MenuItem value="centos-7">CentOS 7</MenuItem>
                  <MenuItem value="centos-8">CentOS 8 Stream</MenuItem>
                  <MenuItem value="debian-10">Debian 10</MenuItem>
                  <MenuItem value="debian-11">Debian 11</MenuItem>
                  <MenuItem value="rhel-8">RHEL 8</MenuItem>
                  <MenuItem value="rhel-9">RHEL 9</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button onClick={handleBack}>
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!apiKey || !operatingSystem || loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Generate Script'}
            </Button>
          </Box>
        </Paper>
      )}

      {/* Step 3: Review Script */}
      {activeStep === 2 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Review Generated Script
          </Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {generatedScript ? (
                <>
                  <Typography variant="subtitle2" gutterBottom>
                    Script for {operatingSystem}
                  </Typography>
                  
                  <Box sx={{ height: 500, border: 1, borderColor: 'grey.300', borderRadius: 1, mb: 3 }}>
                    <MonacoEditor
                      width="100%"
                      height="100%"
                      language={generatedScript.type === 'ps1' ? 'powershell' : 'shell'}
                      theme="vs-dark"
                      value={scriptContent}
                      onChange={setScriptContent}
                      options={{
                        selectOnLineNumbers: true,
                        roundedSelection: false,
                        readOnly: false,
                        cursorStyle: 'line',
                        automaticLayout: true,
                      }}
                    />
                  </Box>
                </>
              ) : (
                <Alert severity="info">
                  No script has been generated yet. Please go back and generate a script.
                </Alert>
              )}
            </>
          )}
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button onClick={handleBack}>
              Back
            </Button>
            <Box>
              <Button 
                variant="outlined" 
                sx={{ mr: 1 }}
                onClick={saveScript}
                disabled={!generatedScript || loading}
              >
                Save Changes
              </Button>
              <Button
                variant="contained"
                onClick={() => window.location.href = '/testing'}
                disabled={!generatedScript || loading}
              >
                Proceed to Testing
              </Button>
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default ScriptGenerator;