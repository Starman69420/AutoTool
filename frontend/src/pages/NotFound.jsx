import React from 'react';
import { Container, Typography, Paper, Box, Button } from '@mui/material';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4, textAlign: 'center' }}>
        <Typography variant="h2" component="h1" gutterBottom>
          404
        </Typography>
        <Typography variant="h4" component="h2" gutterBottom>
          Page Not Found
        </Typography>
        <Paper sx={{ p: 3, my: 3 }}>
          <Typography variant="body1" gutterBottom>
            The page you are looking for does not exist.
          </Typography>
          <Button 
            component={Link} 
            to="/" 
            variant="contained" 
            color="primary"
            sx={{ mt: 2 }}
          >
            Go Home
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default NotFound;