import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';

const Settings = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Typography variant="body1">
            Settings functionality coming soon.
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default Settings;