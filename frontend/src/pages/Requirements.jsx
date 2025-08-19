import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';

const Requirements = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Requirements Management
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Typography variant="body1">
            Requirements management functionality coming soon.
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default Requirements;