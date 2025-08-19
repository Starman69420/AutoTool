import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  Card,
  CardContent,
  CardActions,
  Divider,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Code as CodeIcon,
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import axios from 'axios';

const Dashboard = ({ socket }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    requirements: 0,
    scripts: 0,
    tests: 0,
    successRate: 0,
  });
  const [recentTests, setRecentTests] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch requirements
        const reqResponse = await axios.get('/api/requirements');
        const requirements = reqResponse.data.requirements || [];

        // Fetch scripts
        const scriptsResponse = await axios.get('/api/scripts');
        const scripts = scriptsResponse.data.scripts || [];

        // Fetch tests
        const testsResponse = await axios.get('/api/tests');
        const tests = testsResponse.data.tests || [];

        // Calculate success rate
        const completedTests = tests.filter(test => test.status === 'completed');
        const successfulTests = completedTests.filter(test => test.success);
        const successRate = completedTests.length
          ? Math.round((successfulTests.length / completedTests.length) * 100)
          : 0;

        // Update stats
        setStats({
          requirements: requirements.length,
          scripts: scripts.length,
          tests: tests.length,
          successRate,
        });

        // Set recent tests (up to 5)
        setRecentTests(tests.slice(0, 5));

        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
        setLoading(false);
      }
    };

    fetchData();

    // Listen for socket events
    if (socket) {
      socket.on('test:completed', (data) => {
        // Update recent tests when a new test completes
        fetchData();
      });
    }

    return () => {
      if (socket) {
        socket.off('test:completed');
      }
    };
  }, [socket]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Quick Action Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div">
                Create Requirements
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create or upload a server requirements markdown file
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                size="small" 
                color="primary"
                onClick={() => navigate('/requirements')}
              >
                Get Started
              </Button>
            </CardActions>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div">
                Generate Scripts
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Use AI to generate scripts based on requirements
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                size="small" 
                color="primary"
                onClick={() => navigate('/generator')}
              >
                Generate
              </Button>
            </CardActions>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div">
                Run Tests
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Test scripts in containerized environments
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                size="small" 
                color="primary"
                onClick={() => navigate('/testing')}
              >
                Test Now
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      {/* Stats Cards */}
      <Typography variant="h5" component="h2" gutterBottom>
        Statistics
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Requirements
            </Typography>
            <Typography variant="h4" component="div">
              {stats.requirements}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Scripts
            </Typography>
            <Typography variant="h4" component="div">
              {stats.scripts}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Tests Run
            </Typography>
            <Typography variant="h4" component="div">
              {stats.tests}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Success Rate
            </Typography>
            <Typography variant="h4" component="div">
              {stats.successRate}%
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Tests */}
      <Typography variant="h5" component="h2" gutterBottom>
        Recent Tests
      </Typography>
      <Paper sx={{ p: 2 }}>
        {recentTests.length > 0 ? (
          <List>
            {recentTests.map((test) => (
              <React.Fragment key={test.id}>
                <ListItem 
                  button
                  onClick={() => navigate(`/results?id=${test.id}`)}
                >
                  <ListItemIcon>
                    {test.success ? 
                      <CheckCircleIcon color="success" /> : 
                      <ErrorIcon color="error" />
                    }
                  </ListItemIcon>
                  <ListItemText 
                    primary={`Test for ${test.operatingSystem}`} 
                    secondary={`Status: ${test.status} | Run: ${new Date(test.startTime).toLocaleString()}`}
                  />
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Typography variant="body1" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            No tests have been run yet. Start by creating requirements and generating scripts.
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default Dashboard;