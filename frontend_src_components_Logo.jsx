import React from 'react';
import { Typography, Box } from '@mui/material';
import { Code as CodeIcon } from '@mui/icons-material';

const Logo = ({ height = 40 }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <CodeIcon sx={{ mr: 1, fontSize: height }} color="primary" />
      <Typography
        variant="h6"
        noWrap
        component="div"
        sx={{ fontWeight: 'bold', fontSize: height / 2 }}
      >
        AutoTool
      </Typography>
    </Box>
  );
};

export default Logo;